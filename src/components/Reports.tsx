'use client';

import { useEffect, useState } from 'react';
import { supabase, Report } from '@/lib/supabase';

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 dark:text-gray-400">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Historical Reports</h2>
        <p className="text-gray-600 dark:text-gray-400">View and analyze past reports</p>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No reports available yet
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{report.title}</h3>
                  <div className="flex gap-2 mb-2">
                    {report.event_date && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm">
                        {new Date(report.event_date).toLocaleDateString()}
                      </span>
                    )}
                    {report.source_url && (
                      <a
                        href={report.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                {report.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                {report.entities.slice(0, 3).map((entity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded text-sm"
                  >
                    {entity.name}
                  </span>
                ))}
                {report.entities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded text-sm">
                    +{report.entities.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedReport.title}</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: selectedReport.content }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 