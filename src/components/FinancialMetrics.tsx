'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface Metric {
  symbol: string;
  name: string;
  price: number;
  change: number;
  marketCap: number;
  volume: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function FinancialMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchMetrics = useCallback(async (force = false) => {
    // Check if enough time has passed since last fetch
    const now = Date.now();
    if (!force && now - lastFetchTime < POLLING_INTERVAL) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/financial-metrics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const result = await response.json();
      setMetrics(result.data || []);
      setLoading(false);
      setLastFetchTime(now);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial metrics');
      
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      }
    }
  }, [retryCount, lastFetchTime]);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const initFetch = async () => {
      if (isMounted) {
        await fetchMetrics(true); // Force initial fetch
      }
    };

    initFetch();

    // Only set up polling if component is mounted and no errors
    if (!error && isMounted) {
      intervalId = setInterval(() => {
        fetchMetrics();
      }, POLLING_INTERVAL);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchMetrics, error]);

  if (loading && metrics.length === 0) {
    return (
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div 
            key={i} 
            variants={item}
            className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
          >
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-3 bg-white/10 rounded animate-pulse"></div>
              <div className="h-3 bg-white/10 rounded w-5/6 animate-pulse"></div>
              <div className="h-3 bg-white/10 rounded w-4/6 animate-pulse"></div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
      >
        <p className="text-red-400 mb-2">{error}</p>
        <p className="text-sm text-gray-400 mb-4">
          {retryCount < 3 ? 'Retrying automatically...' : 'Maximum retries reached'}
        </p>
        <button 
          onClick={() => {
            setRetryCount(0);
            setLoading(true);
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {metrics.map((metric) => (
        <motion.div
          key={metric.symbol}
          variants={item}
          className="group p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium tracking-tight">{metric.name}</h3>
              <p className="text-sm text-gray-400">{metric.symbol}</p>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${
              metric.change >= 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(2)}%
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Price</span>
              <span className="font-mono text-lg">${metric.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Market Cap</span>
              <span className="font-mono">${(metric.marketCap / 1e9).toFixed(2)}B</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Volume</span>
              <span className="font-mono">{(metric.volume / 1e6).toFixed(2)}M</span>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}