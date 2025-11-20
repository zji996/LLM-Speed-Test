import React, { useState, useEffect, useRef } from 'react';
import { Header, Sidebar, TestConfigurationComponent, ResultsDashboard, PerformanceCharts } from './components';
import { TestConfiguration as TestConfigType, TestBatch } from './types';
import { useTestProgress } from './hooks';
import { NAVIGATION_ITEMS } from './utils';
import './styles/index.css';

const App: React.FC = () => {
  const [currentBatch, setCurrentBatch] = useState<TestBatch | null>(null);
  const [activeTab, setActiveTab] = useState<'configuration' | 'results' | 'charts'>('configuration');
  const [completedBatches, setCompletedBatches] = useState<TestBatch[]>([]);
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
        const { GetTestProgress } = await import('./wailsjs/go/main/App');
        const progress = await GetTestProgress();

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
          const runningStatus = anyFailed ? 'Testing (some failed)' : 'Testing in progress';
          const completionStatus = anyFailed ? 'Completed with failures' : 'Completed successfully';
          const isComplete = completedCount >= totalTests;

          updateProgress(
            completedCount,
            totalTests,
            isComplete && !hasRunningUpdates ? completionStatus : runningStatus
          );

          if (isComplete) {
            completeTest(completionStatus);

            // Get the final results
            setTimeout(async () => {
              try {
                const { GetTestBatch } = await import('./wailsjs/go/main/App');
                const batch = await GetTestBatch(lastUpdate.batchId);
                if (batch) {
                  console.log('Test batch completed:', batch);
                  setCurrentBatch(batch);
                  setCompletedBatches(prev => [...prev, batch]);
                  setActiveTab('results');
                }
              } catch (error) {
                console.error('Failed to get test batch:', error);
              }
            }, 500);

            completedTestsRef.current.clear();
          }
        }
      } catch (error) {
        console.error('Failed to get progress:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testStatus.isRunning, updateProgress, completeTest]);

  const handleStartTest = async (config: TestConfigType) => {
    try {
      completedTestsRef.current.clear();
      startTest(config.testCount * config.concurrentTests);
      const { StartSpeedTest } = await import('./wailsjs/go/main/App');
      await StartSpeedTest(config);
    } catch (error) {
      failTest(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'png', options?: any) => {
    if (!currentBatch) return;

    try {
      const { ExportTestData } = await import('./wailsjs/go/main/App');
      const filePath = await ExportTestData(currentBatch.id, format, options || {});
      console.log(`Exported to: ${filePath}`);
      alert(`Results exported to: ${filePath}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error}`);
    }
  };

  const handleStopTest = () => {
    completedTestsRef.current.clear();
    stopTest();
  };

  const disabledTabs = testStatus.isRunning ? ['results', 'charts'] :
    (activeTab !== 'configuration' && !currentBatch) ? ['results', 'charts'] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        title="LLM 性能测试"
        subtitle="测试和比较大型语言模型的推理速度性能"
        status={testStatus.status}
        statusType={testStatus.isRunning ? 'running' : testStatus.error ? 'error' : 'success'}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar
            items={NAVIGATION_ITEMS}
            activeTab={activeTab}
            onTabChange={(tab: string) => setActiveTab(tab as 'configuration' | 'results' | 'charts')}
            disabledTabs={disabledTabs}
            testStatus={testStatus}
            completedBatches={completedBatches}
            currentBatch={currentBatch}
            onBatchSelect={setCurrentBatch}
            onStopTest={handleStopTest}
          />

          <div className="flex-1">
            <div className="card animate-fade-in">
              <div className="card-content p-6">
                {activeTab === 'configuration' && (
                  <TestConfigurationComponent
                    onStartTest={handleStartTest}
                    isRunning={testStatus.isRunning}
                  />
                )}

                {activeTab === 'results' && currentBatch && (
                  <ResultsDashboard
                    batch={currentBatch}
                    onExport={handleExport}
                  />
                )}

                {activeTab === 'charts' && currentBatch && (
                  <PerformanceCharts
                    batch={currentBatch}
                    onExport={handleExport}
                  />
                )}

                {activeTab !== 'configuration' && !currentBatch && (
                  <div className="empty-state">
                    <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="empty-state-title">暂无测试数据</h3>
                    <p className="empty-state-description">请先运行性能测试，然后在此处查看结果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
