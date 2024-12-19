'use client';

import { useState, useEffect, useRef } from 'react';
import { useResearchStore } from '@/store/researchStore';

export function QuestionAnswer() {
  const { document, qaHistory, setQaHistory, setCurrentStep } = useResearchStore();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiThoughts, setAiThoughts] = useState<string[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load pending question from localStorage on mount
  useEffect(() => {
    const savedQuestion = localStorage.getItem('pendingQuestion');
    if (savedQuestion) {
      const parsed = JSON.parse(savedQuestion);
      if (parsed.timestamp > Date.now() - 5 * 60 * 1000) { // Only restore if less than 5 minutes old
        setPendingQuestion(parsed);
        pollForAnswer(parsed.id, parsed.question);
      } else {
        localStorage.removeItem('pendingQuestion');
      }
    }
  }, []);

  const pollForAnswer = async (questionId: string, questionText: string) => {
    if (!document) return;

    setLoading(true);
    setAiThoughts([
      "Reading through the document...",
      "Breaking down the content into manageable sections...",
      "Analyzing each section for relevant information...",
      "Looking for specific mentions related to your question...",
      "Cross-referencing information across sections...",
      "Formulating a comprehensive answer..."
    ]);

    try {
      // Create new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch('http://localhost:8001/api/research/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          context_id: document.title,
          document_content: document.content,
          question_id: questionId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Failed to get answer');
      
      const data = await response.json();
      
      // Only update state if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setQaHistory([...qaHistory, { 
          question: questionText, 
          answer: data.answer 
        }]);
        
        // Clear pending question
        setPendingQuestion(null);
        localStorage.removeItem('pendingQuestion');
        
        // Show notification
        setShowNotification(true);
        
        // Play a sound (optional)
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }
    } catch (error) {
      // Only update error state if the request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error getting answer:', error);
        setError('Failed to get answer. Please try again.');
      }
    } finally {
      // Only update loading state if the request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
        setAiThoughts([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const questionId = Date.now().toString();
    const newQuestion = {
      id: questionId,
      question: question.trim(),
      timestamp: Date.now()
    };

    // Save to localStorage
    localStorage.setItem('pendingQuestion', JSON.stringify(newQuestion));
    setPendingQuestion(newQuestion);

    // Start polling
    pollForAnswer(questionId, question.trim());
    
    // Clear input
    setQuestion('');
  };

  if (!document) return null;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">Q&A Session</h2>
        <p className="text-gray-600 dark:text-gray-400">Ask questions about "{document.title}"</p>
      </div>

      <div className="space-y-4">
        {qaHistory.map((qa, index) => (
          <div key={index} className="border rounded-lg p-4 dark:border-gray-700">
            <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">Q: {qa.question}</p>
            <p className="text-gray-700 dark:text-gray-300">A: {qa.answer}</p>
          </div>
        ))}
      </div>

      {/* AI Thought Process */}
      {loading && aiThoughts.length > 0 && (
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center mb-2">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              AI is thinking...
              <span className="ml-2 text-sm">
                (You can continue browsing while I process your question)
              </span>
            </span>
          </div>
          <div className="space-y-2">
            {aiThoughts.map((thought, index) => {
              const isActive = index === Math.floor((Date.now() / 1000) % aiThoughts.length);
              return (
                <div 
                  key={index}
                  className={`flex items-center ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {isActive && (
                    <span className="mr-2 text-blue-600 dark:text-blue-400">→</span>
                  )}
                  <span className={isActive ? 'font-medium' : ''}>{thought}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notification */}
      {showNotification && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-md border border-green-500 animate-slide-up">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Answer Ready!
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your question has been answered. Click here to view it.
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => setShowNotification(false)}
                className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            placeholder="Ask a question about the document..."
            disabled={loading}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Ask Question'}
          </button>
          {qaHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep('report')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Generate Report
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
