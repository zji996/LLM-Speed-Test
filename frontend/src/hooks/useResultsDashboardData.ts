import { useMemo } from 'react';
import { RoundSummary, TestBatch, TestSummary } from '../types';
import { computeRoundSummaries } from '../utils/roundSummary';

export interface ResultsDashboardData {
  isStepTest: boolean;
  summary: TestSummary;
  roundSummaries: RoundSummary[];
}

export const useResultsDashboardData = (batch: TestBatch): ResultsDashboardData => {
  const isStepTest =
    batch.configuration.testMode === 'concurrency_step' ||
    batch.configuration.testMode === 'input_step';

  const roundSummaries = useMemo(
    () => computeRoundSummaries(batch),
    [batch]
  );

  return {
    isStepTest,
    summary: batch.summary,
    roundSummaries,
  };
};

