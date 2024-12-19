'use client';

import { useState, useEffect, useRef } from 'react';
import { DocumentUploader } from './research/DocumentUploader';
import { DocumentSummary } from './research/DocumentSummary';
import { QuestionAnswer } from './research/QuestionAnswer';
import { ReportGenerator } from './research/ReportGenerator';
import { useResearchStore } from '@/store/researchStore';

export function ResearchAgent() {
  const {
    currentStep,
    document,
    summary,
    qaHistory,
    analysisStatus,
    progress,
    setCurrentStep,
    setDocument,
    setSummary,
    setQaHistory,
    setAnalysisStatus,
    setProgress,
  } = useResearchStore();

  const [showNotification, setShowNotification] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const isUnmountingRef = useRef(false);

  // Cleanup function for SSE connection
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const steps = [
    { id: 'upload', label: 'Upload', number: 1 },
    { id: 'summary', label: 'Summary', number: 2 },
    { id: 'qa', label: 'Q&A', number: 3 },
    { id: 'report', label: 'Report', number: 4 }
  ] as const;

  const handleStepClick = (stepId: typeof steps[number]['id']) => {
    // Only allow navigation to steps that have their prerequisites completed
    if (stepId === 'upload') {
      setCurrentStep('upload');
    } else if (stepId === 'summary' && document) {
      setCurrentStep('summary');
    } else if (stepId === 'qa' && summary) {
      setCurrentStep('qa');
    } else if (stepId === 'report' && qaHistory.length > 0) {
      setCurrentStep('report');
    }
  };

  const startProgressTracking = () => {
    // Close any existing connection
    if (eventSource) {
      eventSource.close();
    }

    const newEventSource = new EventSource('http://localhost:8001/api/research/progress');
    setEventSource(newEventSource);
    
    newEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!isUnmountingRef.current) {
        setProgress(data.progress);
        setAnalysisStatus(data.status);
        
        if (data.progress === 100) {
          newEventSource.close();
          setEventSource(null);
          setShowNotification(true);
        }
      }
    };

    newEventSource.onerror = (error) => {
      // Only handle error if it's not due to unmounting/navigation
      if (!isUnmountingRef.current) {
        // Check if the error is due to the connection being closed
        if (newEventSource.readyState === EventSource.CLOSED) {
          newEventSource.close();
          setEventSource(null);
        } else {
          console.error('Unexpected SSE connection error:', error);
        }
      }
      // Always close the connection on error
      newEventSource.close();
      setEventSource(null);
    };
    
    return newEventSource;
  };

  const handleDocumentUpload = async (doc: Document) => {
    try {
      setProgress(0);
      setAnalysisStatus('Starting analysis...');
      setDocument(doc);
      
      // Start the analysis request
      const response = await fetch('http://localhost:8001/api/research/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      
      if (!response.ok) throw new Error('Failed to process document');
      
      // Start progress tracking
      startProgressTracking();
      
      // Get the summary data
      const summaryData = await response.json();
      if (!isUnmountingRef.current) {
        setSummary(summaryData);
        
        // Auto-navigate to summary if user is still on upload step
        if (currentStep === 'upload') {
          setCurrentStep('summary');
        }
      }
    } catch (error) {
      if (!isUnmountingRef.current) {
        console.error('Error uploading document:', error);
        setAnalysisStatus('Error: Failed to analyze document');
        setProgress(0);
      }
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-12 pt-4">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => {
            const isActive = steps.findIndex(s => s.id === currentStep) >= index;
            const isClickable = (
              step.id === 'upload' ||
              (step.id === 'summary' && document) ||
              (step.id === 'qa' && summary) ||
              (step.id === 'report' && qaHistory.length > 0)
            );

            return (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center group ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isActive 
                      ? 'border-blue-600 bg-blue-600 text-white' 
                      : 'border-gray-300 text-gray-300'
                    }
                    ${isClickable && !isActive ? 'group-hover:border-blue-400' : ''}
                  `}>
                    {step.number}
                  </div>
                  <span className={`ml-2 font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  } ${isClickable && !isActive ? 'group-hover:text-blue-400' : ''}`}>
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: isActive ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-md border border-green-500 animate-slide-up">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Analysis Complete!
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your document has been analyzed. Click here to view the summary.
              </p>
              <div className="mt-2">
                <button
                  onClick={() => {
                    setShowNotification(false);
                    setCurrentStep('summary');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View Summary
                </button>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => setShowNotification(false)}
                className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Status with Progress Bar */}
      {analysisStatus && (
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {analysisStatus}
              <span className="ml-2 text-sm">
                (You can continue browsing while we process your document)
              </span>
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-center mt-1 text-sm text-blue-600 dark:text-blue-400">
            {progress}% Complete
          </div>
        </div>
      )}

      {/* Content based on current step */}
      <div className="mt-8">
        {currentStep === 'upload' && (
          <DocumentUploader onUpload={handleDocumentUpload} />
        )}
        
        {currentStep === 'summary' && summary && (
          <DocumentSummary 
            summary={summary}
            onContinue={() => setCurrentStep('qa')}
          />
        )}
        
        {currentStep === 'qa' && document && (
          <QuestionAnswer
            document={document}
            qaHistory={qaHistory}
            setQaHistory={setQaHistory}
            onGenerateReport={() => setCurrentStep('report')}
          />
        )}
        
        {currentStep === 'report' && document && summary && (
          <ReportGenerator
            document={document}
            summary={summary}
            qaHistory={qaHistory}
          />
        )}
      </div>
    </div>
  );
}