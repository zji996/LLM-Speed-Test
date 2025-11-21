import React from 'react';
import { ModernLayout, TestConfigurationComponent, ResultsDashboard, PerformanceCharts, LiveTestDashboard } from './components';
import { useSpeedTestController } from './hooks';
import './styles/index.css';

const App: React.FC = () => {
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

  return (
    <ModernLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      testStatus={testStatus}
    >
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
            mode={currentRunType}
            allBatches={currentRunBatches}
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
