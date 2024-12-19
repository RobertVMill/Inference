'use client';

import { useEffect, useState } from 'react';

interface RegulatoryUpdate {
  title: string;
  description: string;
  region: string;
  date: string;
  impact_level: string;
}

export function RegulatoryUpdates() {
  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/regulatory');
        if (!response.ok) throw new Error('Failed to fetch updates');
        const data = await response.json();
        setUpdates(data);
      } catch (err) {
        setError('Failed to load regulatory updates');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  if (loading) return <div>Loading regulatory updates...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const getImpactColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {updates.map((update, index) => (
        <div key={index} className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{update.title}</h3>
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {update.region}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${getImpactColor(update.impact_level)}`}>
                  {update.impact_level} Impact
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{update.description}</p>
          <p className="text-sm text-gray-500">{new Date(update.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}