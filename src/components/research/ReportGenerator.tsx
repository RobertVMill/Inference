'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/researchStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export function ReportGenerator() {
  const { document } = useResearchStore();
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    if (!document?.content) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/research/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_content: document.content,
          document_url: document.url,
          document_date: document.date,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      setReport(result.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={generateReport}
        disabled={isLoading}
        className="w-full p-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 backdrop-blur-sm rounded-lg text-white font-medium transition-all"
      >
        {isLoading ? 'Generating Report...' : 'Generate Executive Report'}
      </button>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {report && (
        <div className="p-4 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg">
          <h3 className="font-medium mb-4">Executive Report</h3>
          <div className="prose prose-invert max-w-none">
            {report.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 