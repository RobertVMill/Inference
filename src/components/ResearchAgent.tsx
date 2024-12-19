'use client';

import { DocumentUploader } from './research/DocumentUploader';
import { DocumentSummary } from './research/DocumentSummary';
import { QuestionAnswer } from './research/QuestionAnswer';
import { useResearchStore } from '@/store/researchStore';

export function ResearchAgent() {
  const { currentStep } = useResearchStore();

  return (
    <div className="space-y-8">
      {currentStep === 'upload' && <DocumentUploader />}
      {currentStep === 'summary' && <DocumentSummary />}
      {currentStep === 'qa' && <QuestionAnswer />}
    </div>
  );
}