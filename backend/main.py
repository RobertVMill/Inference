from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import yfinance as yf
from datetime import datetime

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FinancialMetric(BaseModel):
    company: str
    symbol: str
    price: float
    change_percent: float
    market_cap: float
    pe_ratio: Optional[float]

class TechEvent(BaseModel):
    company: str
    title: str
    description: str
    date: str
    event_type: str  # e.g., "Product Launch", "Partnership", "Research"

class RegulatoryUpdate(BaseModel):
    title: str
    description: str
    region: str  # e.g., "US", "EU", "Global"
    date: str
    impact_level: str  # e.g., "High", "Medium", "Low"

class ProductNews(BaseModel):
    company: str
    product_name: str
    title: str
    description: str
    date: str
    category: str  # e.g., "AI", "Cloud", "Hardware"

class ResearchQuery(BaseModel):
    query: str

class ResearchResponse(BaseModel):
    summary: str
    sources: List[str]
    timestamp: str

class DocumentUpload(BaseModel):
    content: str
    title: str
    type: str  # 'transcript' or 'article'

class DocumentSummary(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    entities: List[Dict[str, str]]  # e.g., companies, people, technologies mentioned
    timestamp: str

class Question(BaseModel):
    question: str
    context_id: str  # Reference to the uploaded document

class Answer(BaseModel):
    answer: str
    relevant_quotes: List[str]
    confidence: float
    timestamp: str

class Report(BaseModel):
    title: str
    summary: str
    qa_insights: List[Dict[str, str]]
    recommendations: List[str]
    sources: List[str]
    generated_at: str

# Financial Metrics Endpoint
@app.get("/api/financial-metrics", response_model=List[FinancialMetric])
async def get_financial_metrics():
    tech_companies = ["AAPL", "GOOGL", "MSFT", "NVDA", "META"]
    metrics = []
    
    for symbol in tech_companies:
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            metrics.append(
                FinancialMetric(
                    company=info.get('longName', ''),
                    symbol=symbol,
                    price=info.get('currentPrice', 0.0),
                    change_percent=info.get('regularMarketChangePercent', 0.0),
                    market_cap=info.get('marketCap', 0.0),
                    pe_ratio=info.get('forwardPE', None)
                )
            )
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
    
    return metrics

# Tech Events Endpoint
@app.get("/api/tech-events", response_model=List[TechEvent])
async def get_tech_events():
    # This would typically fetch from a news API or database
    return [
        TechEvent(
            company="OpenAI",
            title="GPT-5 Development Announcement",
            description="OpenAI announces development progress on GPT-5 with improved reasoning capabilities.",
            date="2024-03-21",
            event_type="Research"
        ),
        # Add more events...
    ]

# Regulatory Updates Endpoint
@app.get("/api/regulatory", response_model=List[RegulatoryUpdate])
async def get_regulatory_updates():
    return [
        RegulatoryUpdate(
            title="EU AI Act Implementation",
            description="New guidelines for AI system deployment in the European Union.",
            region="EU",
            date="2024-03-20",
            impact_level="High"
        ),
        # Add more updates...
    ]

# Product News Endpoint
@app.get("/api/product-news", response_model=List[ProductNews])
async def get_product_news():
    return [
        ProductNews(
            company="Microsoft",
            product_name="Azure AI",
            title="New Azure AI Features Released",
            description="Microsoft adds new computer vision capabilities to Azure AI services.",
            date="2024-03-19",
            category="AI"
        ),
        # Add more product news...
    ]

# Research Agent Endpoint
@app.post("/api/research", response_model=ResearchResponse)
async def get_research_summary(query: ResearchQuery):
    # This would typically use an LLM or AI service to generate summaries
    return ResearchResponse(
        summary=f"Research summary for: {query.query}",
        sources=["source1.com", "source2.com"],
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/research/upload", response_model=DocumentSummary)
async def upload_document(document: DocumentUpload):
    # Here we'll integrate with an LLM to analyze the document
    return DocumentSummary(
        title=document.title,
        summary="Sample summary of the document...",
        key_points=["Key point 1", "Key point 2"],
        entities=[{"name": "OpenAI", "type": "company"}],
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/research/question", response_model=Answer)
async def ask_question(question: Question):
    # Here we'll use the LLM to answer questions about the document
    return Answer(
        answer="Sample answer to your question...",
        relevant_quotes=["Relevant quote 1", "Relevant quote 2"],
        confidence=0.92,
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/research/generate-report", response_model=Report)
async def generate_report(context_id: str):
    # Here we'll generate a comprehensive report
    return Report(
        title="Analysis Report",
        summary="Comprehensive summary...",
        qa_insights=[{"question": "Q1", "answer": "A1"}],
        recommendations=["Recommendation 1"],
        sources=["Source 1"],
        generated_at=datetime.now().isoformat()
    )