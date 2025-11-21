import React, { useState, useEffect, useRef } from 'react';
import { ModernLayout, TestConfigurationComponent, ResultsDashboard, PerformanceCharts, LiveTestDashboard } from './components';
import { TestConfiguration as TestConfigType, TestBatch, TestResult } from './types';
import { useTestProgress } from './hooks';
import './styles/index.css';

const App: React.FC = () => {
  const [currentBatch, setCurrentBatch] = useState<TestBatch | null>(null);
  const [activeTab, setActiveTab] = useState<'configuration' | 'results' | 'charts'>('configuration');
  const [completedBatches, setCompletedBatches] = useState<TestBatch[]>([]);
  
  // Live data state
  const [realtimeResults, setRealtimeResults] = useState<TestResult[]>([]);
  const [runningBatchId, setRunningBatchId] = useState<string | null>(null);

  // Auto-step testing state
  const [testQueue, setTestQueue] = useState<TestConfigType[]>([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [autoTestTotal, setAutoTestTotal] = useState(0);

  const { testStatus, startTest, updateProgress, completeTest, failTest, stopTest } = useTestProgress();
  const completedTestsRef = useRef<Set<string>>(new Set());

  // Poll for progress updates when test is running
  useEffect(() => {
    if (!testStatus.isRunning) {
      completedTestsRef.current.clear();
      return;
    }

    const interval = setInterval(async () => {
      try {
        const { GetTestProgress, GetTestResults } = await import('./wailsjs/go/main/App');
        
        // Parallelize calls
        const [progress, newResults] = await Promise.all([
          GetTestProgress(),
          GetTestResults()
        ]);

        // Update realtime results
        if (newResults && newResults.length > 0) {
          setRealtimeResults(prev => [...prev, ...newResults]);
        }

        if (progress.length > 0) {
          let anyFailed = false;
          let hasRunningUpdates = false;
          const lastUpdate = progress[progress.length - 1];

          progress.forEach(update => {
            if (update.status === 'running') {
              hasRunningUpdates = true;
              return;
            }

            completedTestsRef.current.add(update.testId);
            if (update.status === 'failed') {
              anyFailed = true;
            }
          });

          const totalTests = lastUpdate.totalTests;
          const completedCount = Math.min(completedTestsRef.current.size, totalTests);
          const runningStatus = anyFailed ? '测试中 (部分失败)' : '测试进行中...';
          const completionStatus = anyFailed ? '测试完成 (有错误)' : '测试完成';
          const isComplete = completedCount >= totalTests;

          // Format status for auto-testing
          let displayStatus = isComplete && !hasRunningUpdates ? completionStatus : runningStatus;
          if (isAutoTesting) {
             const stepNum = autoTestTotal - testQueue.length;
             displayStatus = `${displayStatus} (步骤 ${stepNum}/${autoTestTotal})`;
          }

          updateProgress(
            completedCount,
            totalTests,
            displayStatus
          );

          if (isComplete) {
            completeTest(completionStatus);

            // Get the final results
            setTimeout(async () => {
              try {
                const { GetTestBatch } = await import('./wailsjs/go/main/App');
                const batch = await GetTestBatch(lastUpdate.batchId);
                if (batch) {
                  setCurrentBatch(batch);
                  setCompletedBatches(prev => [...prev, batch]);
                  
                  // Check if we have more tests in the queue
                  if (testQueue.length > 0) {
                    const nextConfig = testQueue[0];
                    const remainingQueue = testQueue.slice(1);
                    setTestQueue(remainingQueue);
                    
                    setTimeout(() => {
                       runTest(nextConfig);
                    }, 1000);
                  } else {
                    // All tests completed
                    setIsAutoTesting(false);
                    setAutoTestTotal(0);
                    setActiveTab('results');
                  }
                }
              } catch (error) {
                console.error('Failed to get test batch:', error);
                setIsAutoTesting(false);
              }
            }, 500);

            completedTestsRef.current.clear();
          }
        }
      } catch (error) {
        console.error('Failed to get progress:', error);
      }
    }, 500); // Increased polling rate for smoother UI

    return () => clearInterval(interval);
  }, [testStatus.isRunning, updateProgress, completeTest, testQueue, isAutoTesting, autoTestTotal]);

  const runTest = async (config: TestConfigType) => {
     try {
      completedTestsRef.current.clear();
      setRealtimeResults([]);
      startTest(config.testCount * config.concurrentTests);
      const { StartSpeedTest } = await import('./wailsjs/go/main/App');
      const batch = await StartSpeedTest(config);
      if (batch && batch.id) {
        setRunningBatchId(batch.id);
      }
    } catch (error) {
      failTest(error instanceof Error ? error.message : 'Unknown error');
      setIsAutoTesting(false);
      setTestQueue([]);
    }
  };

  const handleStartTest = async (config: TestConfigType | TestConfigType[]) => {
    if (Array.isArray(config)) {
      if (config.length === 0) return;
      setIsAutoTesting(true);
      setAutoTestTotal(config.length);
      const firstConfig = config[0];
      setTestQueue(config.slice(1));
      await runTest(firstConfig);
    } else {
      setIsAutoTesting(false);
      setTestQueue([]);
      await runTest(config);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'png', options?: any) => {
    if (!currentBatch) return;
    try {
      const { ExportTestData } = await import('./wailsjs/go/main/App');
      const filePath = await ExportTestData(currentBatch.id, format, options || {});
      alert(`导出成功: ${filePath}`);
    } catch (error) {
      alert(`导出失败: ${error}`);
    }
  };

  return (
    <ModernLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      testStatus={testStatus}
    >
      {activeTab === 'configuration' && (
        <>
          {testStatus.isRunning ? (
             <LiveTestDashboard 
               isRunning={testStatus.isRunning}
               results={realtimeResults}
               totalTests={testStatus.totalTests}
               completedCount={testStatus.currentTest}
             />
          ) : (
            <TestConfigurationComponent
              onStartTest={handleStartTest}
              isRunning={testStatus.isRunning}
            />
          )}
        </>
      )}

      {activeTab === 'results' && (
        currentBatch ? (
          <ResultsDashboard
            batch={currentBatch}
            allBatches={completedBatches}
            onExport={handleExport}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">暂无测试数据，请先开始测试</p>
          </div>
        )
      )}

      {activeTab === 'charts' && (
        currentBatch ? (
          <PerformanceCharts
            batch={currentBatch}
            onExport={handleExport}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
             <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
             </svg>
             <p className="text-lg">暂无图表数据</p>
          </div>
        )
      )}
    </ModernLayout>
  );
};

export default App;
