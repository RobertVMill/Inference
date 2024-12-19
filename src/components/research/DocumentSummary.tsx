'use client';

import { useState, useEffect } from 'react';
import { useResearchStore } from '@/store/researchStore';

export function DocumentSummary() {
  const { summary, setCurrentStep } = useResearchStore();
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    if (summary?.timestamp) {
      // Format the timestamp on the client side
      setFormattedTime(new Date(summary.timestamp).toLocaleString());
    }
  }, [summary?.timestamp]);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">{summary.title}</h2>
        {formattedTime && (
          <p className="text-sm text-gray-500">
            Analyzed on {formattedTime}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Summary</h3>
        <div 
          className="text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: summary.summary }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Key Points</h3>
        <ul className="list-disc list-inside space-y-2">
          {summary.key_points.map((point, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-300">{point}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Entities Mentioned</h3>
        <div className="flex flex-wrap gap-2">
          {summary.entities.map((entity, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
            >
              {entity.name} ({entity.type})
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('qa')}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-8"
      >
        Continue to Q&A
      </button>
    </div>
  );
}
