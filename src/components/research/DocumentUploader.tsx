'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/researchStore';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function DocumentUploader() {
  const { setDocument, setCurrentStep, setAnalysisStatus, setProgress } = useResearchStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'transcript' | 'article'>('article');
  const [url, setUrl] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const doc = {
        title: title.trim(),
        content: content.trim(),
        type,
        url: url.trim() || undefined,
        date: date || undefined
      };

      setProgress(0);
      setAnalysisStatus('Starting analysis...');
      setDocument(doc);
      
      const response = await fetch(`${BACKEND_URL}/api/research/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      
      if (!response.ok) throw new Error('Failed to process document');
      
      const summaryData = await response.json();
      useResearchStore.getState().setSummary(summaryData);
      setCurrentStep('summary');
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to analyze document. Please try again.');
      setAnalysisStatus('Error: Failed to analyze document');
      setProgress(0);
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-8"
      variants={fadeIn}
      initial="hidden"
      animate="show"
    >
      <motion.div 
        className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
        variants={fadeIn}
      >
        <label className="block text-sm font-medium mb-3 text-gray-300">Document Type</label>
        <div className="flex gap-6">
          {['article', 'transcript'].map((option) => (
            <label key={option} className="relative flex items-center group">
              <input
                type="radio"
                value={option}
                checked={type === option}
                onChange={(e) => setType(e.target.value as 'transcript' | 'article')}
                className="peer sr-only"
              />
              <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/20 group-hover:border-white/40 peer-checked:border-blue-500 peer-checked:bg-blue-500/20 transition-all"></div>
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors capitalize">
                {option}
              </span>
            </label>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={fadeIn}>
          <label className="block text-sm font-medium mb-2 text-gray-300">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Enter document title"
          />
        </motion.div>

        <motion.div variants={fadeIn}>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Source URL <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="https://example.com/article"
          />
        </motion.div>
      </div>

      <motion.div variants={fadeIn}>
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Event Date <span className="text-gray-500">(optional)</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </motion.div>

      <motion.div variants={fadeIn}>
        <label className="block text-sm font-medium mb-2 text-gray-300">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          placeholder="Paste your document content here"
        />
      </motion.div>

      {error && (
        <motion.div 
          className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      <motion.button
        type="submit"
        disabled={isAnalyzing}
        className="w-full p-4 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-200 relative overflow-hidden group"
        variants={fadeIn}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Document...
            </>
          ) : (
            <>
              <span>Analyze Document</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.button>
    </motion.form>
  );
}