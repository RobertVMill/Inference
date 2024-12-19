from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
from datetime import datetime
from config import OPENAI_API_KEY
import uvicorn
import yfinance as yf
import tiktoken
import numpy as np
import asyncio
import json
from supabase import create_client, Client
import os
import uuid

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://inference-ai.vercel.app",  # Production (update this with your Vercel domain)
        "https://inference-git-main-robertvmill.vercel.app",  # Preview deployments
        "https://inference-robertvmill.vercel.app"  # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Global progress tracking
current_progress = {"progress": 0, "status": ""}

def update_progress(progress: int, status: str):
    """Update the current progress and status."""
    current_progress["progress"] = progress
    current_progress["status"] = status
    print(f"Progress: {progress}% - {status}")

@app.get("/api/research/progress")
async def progress_stream():
    """SSE endpoint for progress updates."""
    async def event_generator():
        while True:
            if current_progress["progress"] == 100:
                break
            
            # Send progress update
            data = json.dumps(current_progress)
            yield f"data: {data}\n\n"
            
            await asyncio.sleep(0.5)  # Update every 500ms
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

def num_tokens_from_string(string: str, encoding_name: str = "cl100k_base") -> int:
    """Returns the number of tokens in a text string."""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

def split_text_into_chunks(text: str, max_tokens: int = 3000) -> List[str]:
    """Split text into chunks of approximately max_tokens."""
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    chunks = []
    current_chunk = []
    current_size = 0
    
    for token in tokens:
        if current_size >= max_tokens:
            chunk_text = encoding.decode(current_chunk)
            chunks.append(chunk_text)
            current_chunk = []
            current_size = 0
        current_chunk.append(token)
        current_size += 1
    
    if current_chunk:
        chunk_text = encoding.decode(current_chunk)
        chunks.append(chunk_text)
    
    return chunks

def get_embedding(text: str, model="text-embedding-3-small"):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

def process_text_with_context(text: str, query: str = None) -> str:
    """Process text while maintaining context for long documents."""
    # If text is short enough, process directly
    if num_tokens_from_string(text) <= 3000:
        return text
    
    # Split into chunks if text is too long
    chunks = split_text_into_chunks(text, max_tokens=2000)  # Smaller chunks for better processing
    
    if query:
        # For questions, we'll process all chunks to ensure we don't miss anything
        return "\n==========\n".join(chunks)
    else:
        # For summary/key points, process all chunks
        return "\n==========\n".join(chunks)

# AI companies to track
AI_COMPANIES = [
    {"symbol": "NVDA", "name": "NVIDIA"},
    {"symbol": "GOOGL", "name": "Alphabet"},
    {"symbol": "MSFT", "name": "Microsoft"},
    {"symbol": "META", "name": "Meta"},
    {"symbol": "AMD", "name": "AMD"}
]

# Cache for financial metrics
financial_metrics_cache = {
    "data": None,
    "last_updated": None
}

@app.get("/api/financial-metrics")
async def get_financial_metrics():
    """Get financial metrics for AI companies."""
    try:
        # Check cache (refresh every 5 minutes)
        current_time = datetime.now()
        if (financial_metrics_cache["data"] is not None and 
            financial_metrics_cache["last_updated"] is not None and 
            (current_time - financial_metrics_cache["last_updated"]).seconds < 300):
            return financial_metrics_cache["data"]

        print("Fetching fresh financial metrics...")
        metrics = []
        for company in AI_COMPANIES:
            try:
                stock = yf.Ticker(company["symbol"])
                info = stock.fast_info  # Using fast_info instead of info for quicker response
                metrics.append({
                    "symbol": company["symbol"],
                    "name": company["name"],
                    "price": info.last_price if hasattr(info, 'last_price') else 0,
                    "change": info.regular_market_price_change_percent if hasattr(info, 'regular_market_price_change_percent') else 0,
                    "marketCap": info.market_cap if hasattr(info, 'market_cap') else 0,
                    "volume": info.regular_market_volume if hasattr(info, 'regular_market_volume') else 0
                })
            except Exception as e:
                print(f"Error fetching data for {company['name']}: {e}")
                metrics.append({
                    "symbol": company["symbol"],
                    "name": company["name"],
                    "price": 0,
                    "change": 0,
                    "marketCap": 0,
                    "volume": 0
                })

        # Update cache
        financial_metrics_cache["data"] = metrics
        financial_metrics_cache["last_updated"] = current_time
        
        return metrics
    except Exception as e:
        print(f"Error in get_financial_metrics: {e}")
        # If there's an error but we have cached data, return it
        if financial_metrics_cache["data"] is not None:
            return financial_metrics_cache["data"]
        raise HTTPException(status_code=500, detail=str(e))

class Document(BaseModel):
    title: str
    content: str
    type: str
    url: Optional[str] = None
    date: Optional[str] = None

class Entity(BaseModel):
    name: str
    type: str

class Summary(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    entities: List[Entity]
    timestamp: str
    source_url: Optional[str] = None
    event_date: Optional[str] = None

class Question(BaseModel):
    question: str
    context_id: str
    document_content: str
    question_id: str

class Answer(BaseModel):
    answer: str
    status: str = "complete"

# Dictionary to store pending answers
pending_answers = {}

def extract_entities(content: str) -> List[Entity]:
    """Extract named entities using OpenAI."""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Extract key entities (people, organizations, technologies) from the text. Return them in this format: Entity Name (Type)"},
                {"role": "user", "content": content}
            ],
            temperature=0.3,
        )
        entities_text = response.choices[0].message.content
        entities = []
        for line in entities_text.split('\n'):
            if '(' in line and ')' in line:
                name = line.split('(')[0].strip()
                type_ = line.split('(')[1].split(')')[0].strip()
                entities.append(Entity(name=name, type=type_))
        return entities
    except Exception as e:
        print(f"Error extracting entities: {e}")
        return []

def generate_summary(content: str) -> str:
    """Generate a structured summary using OpenAI."""
    try:
        # If content is too long, process it in chunks
        if num_tokens_from_string(content) > 3000:
            chunks = split_text_into_chunks(content)
            chunk_summaries = []
            
            # Generate summary for each chunk
            for i, chunk in enumerate(chunks):
                print(f"Generating summary for chunk {i + 1}/{len(chunks)}...")
                response = client.chat.completions.create(
                    model="gpt-4",  # Using GPT-4 for better structure
                    messages=[
                        {"role": "system", "content": """Generate a structured summary of the text section with clear subtitles.
                            Use the following format:
                            
                            ## Main Points
                            [Summary of main points]
                            
                            ## Key Developments
                            [Important developments or announcements]
                            
                            ## Impact & Implications
                            [Analysis of potential impacts]
                            
                            ## Notable Details
                            [Any other significant details]
                            
                            Make each section concise but informative. Use bullet points where appropriate."""},
                        {"role": "user", "content": chunk}
                    ],
                    temperature=0.5,
                )
                chunk_summaries.append(response.choices[0].message.content)
            
            # Combine chunk summaries into a final summary
            combined_summary = "\n\n".join(chunk_summaries)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a cohesive final summary from these section summaries.
                        Maintain the structured format with clear sections:
                        
                        # Executive Overview
                        [Brief overview of the entire content]
                        
                        ## Key Findings
                        [Main takeaways and findings]
                        
                        ## Strategic Implications
                        [Important implications and impacts]
                        
                        ## Detailed Analysis
                        [Breakdown of major points]
                        
                        ## Additional Insights
                        [Other relevant information]
                        
                        Ensure the summary is well-organized and eliminates redundancy."""},
                    {"role": "user", "content": combined_summary}
                ],
                temperature=0.5,
            )
            return response.choices[0].message.content
        else:
            # For shorter content, process directly with the same structured format
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a structured summary with clear sections:
                        
                        # Executive Overview
                        [Brief overview of the content]
                        
                        ## Key Findings
                        [Main takeaways and findings]
                        
                        ## Strategic Implications
                        [Important implications and impacts]
                        
                        ## Detailed Analysis
                        [Breakdown of major points]
                        
                        ## Additional Insights
                        [Other relevant information]
                        
                        Make each section concise but informative."""},
                    {"role": "user", "content": content}
                ],
                temperature=0.5,
            )
            return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Error generating summary"

def extract_key_points(content: str) -> List[str]:
    """Extract key points using OpenAI."""
    try:
        # If content is too long, process it in chunks
        if num_tokens_from_string(content) > 3000:
            chunks = split_text_into_chunks(content)
            all_points = []
            
            # Extract key points from each chunk
            for i, chunk in enumerate(chunks):
                print(f"Extracting key points from chunk {i + 1}/{len(chunks)}...")
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Extract 2-3 key points from this section of text. Return them as a bullet-pointed list."},
                        {"role": "user", "content": chunk}
                    ],
                    temperature=0.3,
                )
                points = response.choices[0].message.content.split('\n')
                all_points.extend([point.replace('•', '').replace('-', '').strip() for point in points if point.strip()])
            
            # Combine and deduplicate key points
            if len(all_points) > 5:
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "From these key points, create a final list of 3-5 most important points, combining similar points and eliminating redundancy:"},
                        {"role": "user", "content": "\n".join(all_points)}
                    ],
                    temperature=0.3,
                )
                final_points = response.choices[0].message.content.split('\n')
                return [point.replace('•', '').replace('-', '').strip() for point in final_points if point.strip()]
            return all_points
        else:
            # For shorter content, process directly
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Extract 3-5 key points from the text. Return them as a bullet-pointed list."},
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
            )
            points = response.choices[0].message.content.split('\n')
            return [point.replace('•', '').replace('-', '').strip() for point in points if point.strip()]
    except Exception as e:
        print(f"Error extracting key points: {e}")
        return []

@app.post("/api/research/upload")
async def process_document(document: Document) -> Summary:
    try:
        update_progress(0, "Starting document analysis...")
        print(f"Processing document: {document.title}")
        
        update_progress(10, "Processing content...")
        processed_content = process_text_with_context(document.content)
        
        # Calculate total chunks for progress tracking
        chunks = split_text_into_chunks(processed_content) if num_tokens_from_string(processed_content) > 3000 else [processed_content]
        total_chunks = len(chunks)
        chunk_progress = 60 / (total_chunks * 3)  # Distribute 60% progress across all chunk operations
        
        update_progress(20, "Generating summary...")
        summary_text = ""
        if total_chunks > 1:
            chunk_summaries = []
            for i, chunk in enumerate(chunks):
                progress = 20 + (i + 1) * chunk_progress
                update_progress(int(progress), f"Generating summary for section {i + 1}/{total_chunks}...")
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": """Generate a structured summary of the text section with clear subtitles.
                            Use the following format:
                            
                            ## Main Points
                            [Summary of main points]
                            
                            ## Key Developments
                            [Important developments or announcements]
                            
                            ## Impact & Implications
                            [Analysis of potential impacts]
                            
                            ## Notable Details
                            [Any other significant details]
                            
                            Make each section concise but informative. Use bullet points where appropriate."""},
                        {"role": "user", "content": chunk}
                    ],
                    temperature=0.5,
                )
                chunk_summaries.append(response.choices[0].message.content)
            
            update_progress(40, "Combining summaries...")
            combined_summary = "\n\n".join(chunk_summaries)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a cohesive final summary from these section summaries.
                        Maintain the structured format with clear sections:
                        
                        # Executive Overview
                        [Brief overview of the entire content]
                        
                        ## Key Findings
                        [Main takeaways and findings]
                        
                        ## Strategic Implications
                        [Important implications and impacts]
                        
                        ## Detailed Analysis
                        [Breakdown of major points]
                        
                        ## Additional Insights
                        [Other relevant information]
                        
                        Ensure the summary is well-organized and eliminates redundancy."""},
                    {"role": "user", "content": combined_summary}
                ],
                temperature=0.5,
            )
            summary_text = response.choices[0].message.content
        else:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a structured summary with clear sections:
                        
                        # Executive Overview
                        [Brief overview of the content]
                        
                        ## Key Findings
                        [Main takeaways and findings]
                        
                        ## Strategic Implications
                        [Important implications and impacts]
                        
                        ## Detailed Analysis
                        [Breakdown of major points]
                        
                        ## Additional Insights
                        [Other relevant information]
                        
                        Make each section concise but informative."""},
                    {"role": "user", "content": processed_content}
                ],
                temperature=0.5,
            )
            summary_text = response.choices[0].message.content
        
        update_progress(50, "Extracting key points...")
        key_points = extract_key_points(processed_content)
        
        update_progress(80, "Extracting entities...")
        entities = extract_entities(processed_content)
        
        update_progress(100, "Analysis complete!")
        
        return Summary(
            title=document.title,
            summary=summary_text,
            key_points=key_points,
            entities=entities,
            timestamp=datetime.now().isoformat(),
            source_url=document.url,
            event_date=document.date
        )
    except Exception as e:
        print(f"Error processing document: {e}")
        update_progress(0, f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/research/question")
async def answer_question(question: Question) -> Answer:
    try:
        print(f"Processing question: {question.question}")
        print(f"Question ID: {question.question_id}")
        
        # Check if we already have an answer for this question
        if question.question_id in pending_answers:
            answer = pending_answers[question.question_id]
            if answer["status"] == "complete":
                # Remove from pending and return the answer
                result = Answer(**pending_answers.pop(question.question_id))
                return result
            else:
                # Still processing
                return Answer(answer="", status="processing")
        
        # Get all document content in chunks
        chunks = split_text_into_chunks(question.document_content, max_tokens=2000)
        total_chunks = len(chunks)
        
        if total_chunks == 1:
            # If document is small enough, process it directly
            relevant_content = chunks[0]
        else:
            # For larger documents, first find potential answers in each chunk
            potential_answers = []
            
            for i, chunk in enumerate(chunks):
                print(f"Processing chunk {i + 1}/{total_chunks} for potential answer...")
                
                response = client.chat.completions.create(
                    model="gpt-4",  # Using GPT-4 for better comprehension
                    messages=[
                        {"role": "system", "content": """Analyze this text section and determine if it contains information relevant to the question.
                            If it contains relevant information, extract and quote the specific parts that answer the question.
                            If it doesn't contain relevant information, respond with "NO_RELEVANT_INFO"."""},
                        {"role": "user", "content": f"""Question: {question.question}
                            
                            Text section:
                            {chunk}"""}
                    ],
                    temperature=0.3,
                )
                
                chunk_result = response.choices[0].message.content
                if chunk_result != "NO_RELEVANT_INFO":
                    potential_answers.append(chunk_result)
            
            if not potential_answers:
                return Answer(answer=f"The document does not provide information about {question.question}")
            
            # Combine all relevant chunks
            relevant_content = "\n---\n".join(potential_answers)
        
        # Final answer generation with GPT-4
        prompt = f"""
        Based on the following relevant information from the document, please answer this question: {question.question}

        Relevant document content:
        {relevant_content}

        Instructions:
        1. Answer ONLY based on the information provided above
        2. If the answer is explicitly stated, quote the relevant parts
        3. If the information is not clear or complete, say so
        4. Be precise and specific in your answer
        5. Do not make assumptions or add external information
        """

        response = client.chat.completions.create(
            model="gpt-4",  # Using GPT-4 for final answer
            messages=[
                {"role": "system", "content": """You are a precise document analysis assistant. Your task is to:
                    1. Answer questions based ONLY on the provided document content
                    2. Always quote relevant parts of the document in your answer
                    3. Be very specific and accurate
                    4. If you're not completely certain, say so
                    5. Never make assumptions or add external information"""
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )
        
        answer = response.choices[0].message.content
        
        # Store the completed answer
        pending_answers[question.question_id] = {
            "answer": answer,
            "status": "complete"
        }
        
        print("Answer generated successfully")
        return Answer(answer=answer, status="complete")
    except Exception as e:
        print(f"Error answering question: {e}")
        # Store the error state
        pending_answers[question.question_id] = {
            "answer": f"Error: {str(e)}",
            "status": "error"
        }
        raise HTTPException(status_code=500, detail=str(e))

async def save_report(report: dict) -> dict:
    """Save a report to Supabase."""
    try:
        report_id = str(uuid.uuid4())
        report_data = {
            "id": report_id,
            "title": report["title"],
            "content": report["content"],
            "summary": report["summary"],
            "key_points": report["key_points"],
            "entities": report["entities"],
            "source_url": report.get("source_url"),
            "event_date": report.get("event_date"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("reports").insert(report_data).execute()
        return result.data[0]
    except Exception as e:
        print(f"Error saving report to Supabase: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/research/generate-report")
async def generate_report(document: Document):
    """Generate and save a comprehensive report."""
    try:
        update_progress(0, "Starting report generation...")
        
        # Process the document content
        processed_content = process_text_with_context(document.content)
        
        update_progress(20, "Generating summary...")
        summary = generate_summary(processed_content)
        
        update_progress(40, "Extracting key points...")
        key_points_response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Extract the key points from the text as a list. Focus on the most important insights and findings."},
                {"role": "user", "content": processed_content}
            ],
            temperature=0.3,
        )
        key_points = key_points_response.choices[0].message.content.split('\n')
        key_points = [point.strip('- ').strip() for point in key_points if point.strip()]
        
        update_progress(60, "Extracting entities...")
        entities = extract_entities(processed_content)
        
        update_progress(80, "Generating final report...")
        report_response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Generate a comprehensive report in HTML format with the following sections:
                    1. Executive Summary
                    2. Key Findings
                    3. Analysis & Implications
                    4. Recommendations
                    5. Technical Details (if applicable)
                    
                    Use appropriate HTML tags for structure (h2, p, ul, etc.)."""},
                {"role": "user", "content": processed_content}
            ],
            temperature=0.5,
        )
        
        report_content = report_response.choices[0].message.content
        
        # Prepare report data
        report_data = {
            "title": document.title,
            "content": report_content,
            "summary": summary,
            "key_points": key_points,
            "entities": [entity.dict() for entity in entities],
            "source_url": document.url,
            "event_date": document.date
        }
        
        update_progress(90, "Saving report...")
        saved_report = await save_report(report_data)
        
        update_progress(100, "Report generation complete!")
        
        return saved_report
    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting AI News App backend server...")
    uvicorn.run(app, host="0.0.0.0", port=8001) 