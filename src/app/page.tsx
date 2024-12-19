'use client';

import { useState } from 'react';
import { FinancialMetrics } from '@/components/FinancialMetrics';
import { TechEvents } from '@/components/TechEvents';
import { RegulatoryUpdates } from '@/components/RegulatoryUpdates';
import { ProductNews } from '@/components/ProductNews';
import { ResearchAgent } from '@/components/ResearchAgent';
import { Reports } from '@/components/Reports';

export default function Home() {
  const [activeTab, setActiveTab] = useState('financial');

  const tabs = [
    { id: 'financial', label: 'Financial Metrics' },
    { id: 'events', label: 'Tech Events' },
    { id: 'regulatory', label: 'Regulatory' },
    { id: 'products', label: 'Product News' },
    { id: 'research', label: 'Research Agent' },
    { id: 'reports', label: 'Reports' },
  ];

  // Calculate header height: title (64px) + tabs (56px) + borders/padding + extra safety margin
  const headerHeight = 160; // Increased from 132px to 160px for better spacing

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-8">
          <h1 className="text-4xl font-bold py-6">Inference</h1>
          <div className="flex space-x-4 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 focus:outline-none transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 font-semibold text-blue-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main 
        className="max-w-7xl mx-auto px-8 py-8"
        style={{ marginTop: `${headerHeight}px` }}
      >
        {activeTab === 'financial' && <FinancialMetrics />}
        {activeTab === 'events' && <TechEvents />}
        {activeTab === 'regulatory' && <RegulatoryUpdates />}
        {activeTab === 'products' && <ProductNews />}
        {activeTab === 'research' && <ResearchAgent />}
        {activeTab === 'reports' && <Reports />}
      </main>
    </div>
  );
}
