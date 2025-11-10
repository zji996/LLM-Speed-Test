import { useState, useEffect } from 'react';

export interface TestProgress {
  isRunning: boolean;
  progress: number;
  currentTest: number;
  totalTests: number;
  status: string;
  error?: string;
}

export const useTestProgress = (initialState: TestProgress = {
  isRunning: false,
  progress: 0,
  currentTest: 0,
  totalTests: 0,
  status: 'Ready'
}) => {
  const [testStatus, setTestStatus] = useState<TestProgress>(initialState);

  const startTest = (totalTests: number) => {
    setTestStatus({
      isRunning: true,
      progress: 0,
      currentTest: 0,
      totalTests,
      status: 'Starting test...'
    });
  };

  const updateProgress = (currentTest: number, totalTests: number, status: string) => {
    const progressPercent = (currentTest / totalTests) * 100;
    setTestStatus(prev => ({
      ...prev,
      currentTest,
      totalTests,
      progress: progressPercent,
      status
    }));
  };

  const completeTest = (status: string = 'Completed') => {
    setTestStatus(prev => ({
      ...prev,
      isRunning: false,
      status
    }));
  };

  const failTest = (error: string) => {
    setTestStatus(prev => ({
      ...prev,
      isRunning: false,
      status: 'Failed',
      error
    }));
  };

  const stopTest = () => {
    setTestStatus(prev => ({
      ...prev,
      isRunning: false,
      status: 'Test stopped by user'
    }));
  };

  return {
    testStatus,
    startTest,
    updateProgress,
    completeTest,
    failTest,
    stopTest
  };
};