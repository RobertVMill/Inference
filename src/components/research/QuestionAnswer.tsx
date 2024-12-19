'use client';

import { useState, useEffect, useCallback } from 'react';
import { useResearchStore } from '@/store/researchStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export function QuestionAnswer() {
  const { document } = useResearchStore();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollForAnswer = useCallback(async (questionId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/research/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          question: question,
          document_content: document?.content || '',
          context_id: 'current'
        }),
      });

      if (!response.ok) throw new Error('Failed to get answer');
      
      const data = await response.json();
      if (data.status === 'complete') {
        setAnswer(data.answer);
        setIsLoading(false);
      } else if (data.status === 'error') {
        throw new Error(data.answer);
      } else {
        // Still processing, poll again in 1 second
        setTimeout(() => pollForAnswer(questionId), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
      setIsLoading(false);
    }
  }, [question, document?.content]);

  useEffect(() => {
    if (isLoading) {
      const questionId = Math.random().toString(36).substring(7);
      pollForAnswer(questionId);
    }
  }, [isLoading, pollForAnswer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setAnswer('');
  };

  if (!document) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Ask a question about the document</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full h-24 p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="What are the main points discussed in the document?"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="w-full p-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 backdrop-blur-sm rounded-lg text-white font-medium transition-all"
        >
          {isLoading ? 'Analyzing...' : 'Ask Question'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {answer && (
        <div className="p-4 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg">
          <h3 className="font-medium mb-2">Answer:</h3>
          <div className="prose prose-invert max-w-none">
            {answer.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
