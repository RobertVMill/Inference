import { create } from 'zustand';

interface Document {
  title: string;
  content: string;
  type: 'transcript' | 'article';
  url?: string;
  date?: string;
}

interface Summary {
  title: string;
  summary: string;
  key_points: string[];
  entities: Array<{ name: string; type: string }>;
  timestamp: string;
}

interface ResearchState {
  currentStep: 'upload' | 'summary' | 'qa' | 'report';
  document: Document | null;
  summary: Summary | null;
  qaHistory: Array<{ question: string; answer: string }>;
  analysisStatus: string;
  progress: number;
  
  // Actions
  setCurrentStep: (step: 'upload' | 'summary' | 'qa' | 'report') => void;
  setDocument: (doc: Document | null) => void;
  setSummary: (summary: Summary | null) => void;
  setQaHistory: (history: Array<{ question: string; answer: string }>) => void;
  setAnalysisStatus: (status: string) => void;
  setProgress: (progress: number) => void;
  resetState: () => void;
}

export const useResearchStore = create<ResearchState>((set) => ({
  currentStep: 'upload',
  document: null,
  summary: null,
  qaHistory: [],
  analysisStatus: '',
  progress: 0,

  // Actions
  setCurrentStep: (step) => set({ currentStep: step }),
  setDocument: (doc) => set({ document: doc }),
  setSummary: (summary) => set({ summary: summary }),
  setQaHistory: (history) => set({ qaHistory: history }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setProgress: (progress) => set({ progress: progress }),
  resetState: () => set({
    currentStep: 'upload',
    document: null,
    summary: null,
    qaHistory: [],
    analysisStatus: '',
    progress: 0,
  }),
})); 