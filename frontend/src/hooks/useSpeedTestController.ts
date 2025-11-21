import { useEffect, useRef, useState } from 'react';
import {
  ExportOptions,
  TestConfiguration as TestConfigType,
  TestBatch,
  TestResult,
  TelemetryUpdate,
} from '../types';
import { useTestProgress, TestProgress } from './useTestProgress';
import { GetTestProgress, GetTestResults, GetTestBatch, StartSpeedTest, ExportTestData, GetTelemetryUpdates } from '../wailsjs/go/main/App';

const MAX_COMPLETED_BATCHES = 50;
const MAX_REALTIME_RESULTS = 500;
const MAX_TELEMETRY_POINTS = 600; // 5 mins at 500ms interval

export type ActiveTab = 'configuration' | 'results' | 'charts';
export type RunType = 'single' | 'auto';

export interface SpeedTestControllerState {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentBatch: TestBatch | null;
  completedBatches: TestBatch[];
  currentRunBatches: TestBatch[];
  realtimeResults: TestResult[];
  telemetryHistory: TelemetryUpdate[];
  testStatus: TestProgress;
  isAutoTesting: boolean;
  hasQueuedTests: boolean;
  currentRunType: RunType;
  handleStartTest: (config: TestConfigType | TestConfigType[]) => Promise<void>;
  handleExport: (format: 'csv' | 'json' | 'png', options?: ExportOptions) => Promise<void>;
}

export const useSpeedTestController = (): SpeedTestControllerState => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('configuration');
  const [currentBatch, setCurrentBatch] = useState<TestBatch | null>(null);
  const [completedBatches, setCompletedBatches] = useState<TestBatch[]>([]);
  const [currentRunBatches, setCurrentRunBatches] = useState<TestBatch[]>([]);

  // Live data state
  const [realtimeResults, setRealtimeResults] = useState<TestResult[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryUpdate[]>([]);
  const [runningBatchId, setRunningBatchId] = useState<string | null>(null);

  // Auto-step testing state
  const [testQueue, setTestQueue] = useState<TestConfigType[]>([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [autoTestTotal, setAutoTestTotal] = useState(0);
  const [currentRunType, setCurrentRunType] = useState<RunType>('single');

  const { testStatus, startTest, updateProgress, completeTest, failTest } = useTestProgress();
  const completedTestsRef = useRef<Set<string>>(new Set());

  // Poll for progress updates when test is running
  useEffect(() => {
    if (!testStatus.isRunning) {
      completedTestsRef.current.clear();
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Parallelize calls
        const [progress, newResults, newTelemetry] = await Promise.all([
          GetTestProgress(),
          GetTestResults(),
          GetTelemetryUpdates()
        ]);

        // Update telemetry
        if (newTelemetry && newTelemetry.length > 0) {
          setTelemetryHistory(prev => {
            const merged = [...prev, ...newTelemetry];
            if (merged.length > MAX_TELEMETRY_POINTS) {
              return merged.slice(merged.length - MAX_TELEMETRY_POINTS);
            }
            return merged;
          });
        }

        // Update realtime results with an upper bound to avoid
        // unbounded growth for very large test runs.
        if (newResults && newResults.length > 0) {
          setRealtimeResults(prev => {
            const merged = [...prev, ...newResults];
            if (merged.length > MAX_REALTIME_RESULTS) {
              return merged.slice(merged.length - MAX_REALTIME_RESULTS);
            }
            return merged;
          });
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
                const batch = await GetTestBatch(lastUpdate.batchId);
                if (batch) {
                  setCurrentBatch(batch);
                  setCurrentRunBatches(prev => [...prev, batch]);
                  setCompletedBatches(prev => {
                    const updated = [...prev, batch];
                    if (updated.length > MAX_COMPLETED_BATCHES) {
                      return updated.slice(updated.length - MAX_COMPLETED_BATCHES);
                    }
                    return updated;
                  });

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
      setTelemetryHistory([]);
      startTest(config.testCount * config.concurrentTests);
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
      setCurrentRunType('auto');
      setCurrentRunBatches([]);
      setIsAutoTesting(true);
      setAutoTestTotal(config.length);
      const firstConfig = config[0];
      setTestQueue(config.slice(1));
      await runTest(firstConfig);
    } else {
      setCurrentRunType('single');
      setCurrentRunBatches([]);
      setIsAutoTesting(false);
      setTestQueue([]);
      await runTest(config);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'png', options?: ExportOptions) => {
    if (!currentBatch) return;
    try {
      const filePath = await ExportTestData(currentBatch.id, format, options || {});
      alert(`导出成功: ${filePath}`);
    } catch (error) {
      alert(`导出失败: ${error}`);
    }
  };

  return {
    activeTab,
    setActiveTab,
    currentBatch,
    completedBatches,
    currentRunBatches,
    realtimeResults,
    telemetryHistory,
    testStatus,
    isAutoTesting,
    hasQueuedTests: testQueue.length > 0,
    currentRunType,
    handleStartTest,
    handleExport
  };
};
