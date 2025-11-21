import { useMemo } from 'react';
import { TestBatch } from '../types';

export interface InfoBadge {
  label: string;
  value: string;
  className: string;
}

export interface PerformanceChartsData {
  isStepTest: boolean;
  totalTests: number;
  successRate: string;
  infoBadges: InfoBadge[];
}

export const usePerformanceChartsData = (batch: TestBatch): PerformanceChartsData => {
  const totalTests = batch.summary.totalTests || batch.results.length;

  const successRate = totalTests > 0
    ? ((batch.summary.successfulTests / totalTests) * 100).toFixed(1)
    : '0.0';

  const isStepTest =
    batch.configuration.testMode === 'concurrency_step' ||
    batch.configuration.testMode === 'input_step';

  const infoBadges = useMemo<InfoBadge[]>(() => ([
    {
      label: '模型',
      value: batch.configuration.model || '未指定',
      className: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20',
    },
    {
      label: '样本数',
      value: `${totalTests}`,
      className: 'text-white bg-white/10 border-white/20',
    },
    {
      label: '成功率',
      value: `${successRate}%`,
      className: `text-${Number(successRate) > 90 ? '[var(--color-success)]' : '[var(--color-warning)]'} bg-white/5`,
    },
  ]), [batch.configuration.model, successRate, totalTests]);

  return {
    isStepTest,
    totalTests,
    successRate,
    infoBadges,
  };
};

