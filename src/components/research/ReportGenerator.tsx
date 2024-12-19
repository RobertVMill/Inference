'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/researchStore';

export function ReportGenerator() {
  const { document, summary, qaHistory } = useResearchStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!document || !summary) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8001/api/research/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.title,
          content: document.content,
          type: document.type,
          url: document.url,
          date: document.date
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');
      
      const data = await response.json();
      
      // Navigate to the Reports tab to view the saved report
      window.location.hash = '#reports';
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!document || !summary) return null;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">Generate Report</h2>
        <p className="text-gray-600">Create a comprehensive report based on the analysis</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">Report Contents</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
            <li>Document Summary</li>
            <li>Key Points Analysis</li>
            <li>Entity Analysis</li>
            <li>Q&A Session Summary</li>
            <li>Recommendations & Insights</li>
          </ul>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Report...
            </>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>
    </div>
  );
} 