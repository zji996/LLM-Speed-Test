import React, { useEffect, useState, Suspense } from 'react';
import { ModernLayout } from './components/layout';
import { useSpeedTestController } from './hooks';
import './styles/index.css';

// Lazy load heavy components
const TestConfigurationComponent = React.lazy(() => import('./components/test/TestConfiguration'));
const ResultsDashboard = React.lazy(() => import('./components/test/ResultsDashboard'));
const PerformanceCharts = React.lazy(() => import('./components/test/PerformanceCharts'));
const LiveTestDashboard = React.lazy(() => import('./components/test/LiveTestDashboard'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="relative w-12 h-12">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-[var(--color-primary)] rounded-full border-t-transparent animate-spin"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('v0.3');

  const {
    activeTab,
    setActiveTab,
    currentBatch,
    completedBatches,
    currentRunBatches,
    realtimeResults,
    telemetryHistory,
    testStatus,
    isAutoTesting,
    hasQueuedTests,
    currentRunType,
    handleStartTest,
    handleExport
  } = useSpeedTestController();

  useEffect(() => {
    let isMounted = true;

    const loadVersion = async () => {
      try {
        const { GetAppVersion } = await import('./wailsjs/go/main/App');
        const version = await GetAppVersion();
        if (isMounted && version) {
          setAppVersion(version);
        }
      } catch (error) {
        console.error('Failed to load app version', error);
      }
    };

    loadVersion();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ModernLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      testStatus={testStatus}
      appVersion={appVersion}
    >
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'configuration' && (
          <>
            {testStatus.isRunning || (isAutoTesting && hasQueuedTests) ? (
              <LiveTestDashboard
                isRunning={testStatus.isRunning}
                results={realtimeResults}
                telemetry={telemetryHistory}
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
              allBatches={currentRunBatches}
              mode={currentRunType}
              onExport={handleExport}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
              <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">暂无测试数据</p>
              <p className="text-sm mt-2 opacity-75">请在配置页开始测试</p>
            </div>
          )
        )}

        {activeTab === 'charts' && (
          currentBatch ? (
            <PerformanceCharts
              batch={currentBatch}
              onExport={handleExport}
              mode={currentRunType}
              allBatches={currentRunBatches}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
              <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-lg font-medium">暂无图表数据</p>
              <p className="text-sm mt-2 opacity-75">测试完成后将显示分析图表</p>
            </div>
          )
        )}
      </Suspense>
    </ModernLayout>
  );
};


export default App;
