import { useMemo } from 'react';
import { TestBatch, TestResult } from '../types';

export interface StepPerformancePoint {
  xValue: number; // Concurrency or Prompt Length
  avgSingleOutput: number;
  avgTotalOutput: number;
  avgSinglePrefill: number;
  avgTotalPrefill: number;
  avgTTFT: number;
}

export interface StepPerformanceData {
  isConcurrencyStep: boolean;
  isInputStep: boolean;
  xLabel: string;
  points: StepPerformancePoint[];
}

export const useStepPerformanceData = (batch: TestBatch): StepPerformanceData => {
  const { testMode } = batch.configuration;

  const isConcurrencyStep = testMode === 'concurrency_step';
  const isInputStep = testMode === 'input_step';

  const points = useMemo<StepPerformancePoint[]>(() => {
    const dataMap = new Map<number, TestResult[]>();

    batch.results.forEach(result => {
      // Only aggregate successful requests so that failed
      // or aborted runs do not drag down averages.
      if (!result.success) {
        return;
      }

      let key = 0;
      if (isConcurrencyStep) {
        key = result.actualConcurrency || result.configuration.concurrentTests;
      } else if (isInputStep) {
        // Use actual prompt tokens for grouping; this better
        // reflects real input size when models apply truncation.
        key = result.promptTokens;
      } else {
        return;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, []);
      }
      dataMap.get(key)!.push(result);
    });

    const aggregated: StepPerformancePoint[] = [];

    dataMap.forEach((results, key) => {
      if (results.length === 0) return;

      const totalSingleOutput = results.reduce((sum, r) => sum + r.outputTokensPerSecond, 0);
      const avgSingleOutput = totalSingleOutput / results.length;

      const totalSinglePrefill = results.reduce((sum, r) => sum + r.prefillTokensPerSecond, 0);
      const avgSinglePrefill = totalSinglePrefill / results.length;

      const totalTTFT = results.reduce((sum, r) => sum + r.requestLatency, 0);
      const avgTTFT = totalTTFT / results.length;

      const stepConcurrency =
        results[0].actualConcurrency || results[0].configuration.concurrentTests || 1;

      const avgTotalOutput = avgSingleOutput * stepConcurrency;
      const avgTotalPrefill = avgSinglePrefill * stepConcurrency;

      aggregated.push({
        xValue: key,
        avgSingleOutput,
        avgTotalOutput,
        avgSinglePrefill,
        avgTotalPrefill,
        avgTTFT,
      });
    });

    return aggregated.sort((a, b) => a.xValue - b.xValue);
  }, [batch, isConcurrencyStep, isInputStep]);

  const xLabel = isConcurrencyStep ? '并发数 (Concurrency)' : '输入长度 (Tokens)';

  return {
    isConcurrencyStep,
    isInputStep,
    xLabel,
    points,
  };
};

