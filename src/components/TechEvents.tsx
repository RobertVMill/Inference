'use client';

import { useEffect, useState } from 'react';

interface TechEvent {
  company: string;
  title: string;
  description: string;
  date: string;
  event_type: string;
}

export function TechEvents() {
  const [events, setEvents] = useState<TechEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/tech-events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError('Failed to load tech events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div>Loading tech events...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <div key={index} className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{event.company}</p>
            </div>
            <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {event.event_type}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{event.description}</p>
          <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}