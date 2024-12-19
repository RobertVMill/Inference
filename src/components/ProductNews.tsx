'use client';

import { useEffect, useState } from 'react';

interface ProductNews {
  company: string;
  product_name: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

export function ProductNews() {
  const [news, setNews] = useState<ProductNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/product-news');
        if (!response.ok) throw new Error('Failed to fetch product news');
        const data = await response.json();
        setNews(data);
      } catch (err) {
        setError('Failed to load product news');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) return <div>Loading product news...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {news.map((item, index) => (
        <div key={index} className="p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{item.company}</span>
              <h3 className="text-xl font-semibold mt-1">{item.title}</h3>
            </div>
            <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {item.category}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Product: {item.product_name}</span>
            <span>{new Date(item.date).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}