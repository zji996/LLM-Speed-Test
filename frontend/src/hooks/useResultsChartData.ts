import { useMemo } from 'react';
import { RoundSummary, TestBatch } from '../types';
import { computeRoundSummaries } from '../utils/roundSummary';

export type ChartMetric = 'latency' | 'throughput' | 'roundThroughput';

type BatchResult = TestBatch['results'][number];
type BatchSummary = TestBatch['summary'];

interface ChartConfig {
  label: string;
  description: string;
  accessor?: (result: BatchResult) => number;
  roundAccessor?: (round: RoundSummary) => number;
  summary: (summary: BatchSummary) => { average?: number; min?: number; max?: number };
  better: 'higher' | 'lower';
  chipLabel: string;
  bestLabel: string;
  color: {
    line: string;
    dot: string;
    gradientFrom: string;
    gradientTo: string;
  };
}

const CHART_CONFIG: Record<ChartMetric, ChartConfig> = {
  latency: {
    label: '响应延迟趋势',
    description: '展示每次测试的总耗时（TTFT + 解码），数值越低代表响应越快',
    accessor: (result) => result.totalLatency,
    summary: (summary) => ({
      average: summary.averageLatency,
      min: summary.minLatency,
      max: summary.maxLatency,
    }),
    better: 'lower',
    chipLabel: '最新延迟',
    bestLabel: '最低延迟',
    color: {
      line: '#f59e0b',
      dot: '#d97706',
      gradientFrom: 'rgba(245, 158, 11, 0.5)',
      gradientTo: 'rgba(245, 158, 11, 0.05)',
    },
  },
  throughput: {
    label: '吞吐性能趋势',
    description: '展示模型在解码阶段的吞吐表现（tokens/sec），数值越高越好',
    accessor: (result) => result.throughput,
    summary: (summary) => ({
      average: summary.averageThroughput,
      min: summary.minThroughput,
      max: summary.maxThroughput,
    }),
    better: 'higher',
    chipLabel: '最新吞吐',
    bestLabel: '最高吞吐',
    color: {
      line: '#06b6d4',
      dot: '#0891b2',
      gradientFrom: 'rgba(6, 182, 212, 0.5)',
      gradientTo: 'rgba(6, 182, 212, 0.05)',
    },
  },
  roundThroughput: {
    label: '轮次总吞吐趋势',
    description: '展示每个测试轮中所有并发请求的输出吞吐总和，用于衡量整体并发能力',
    roundAccessor: (round) => round.totalOutputTokensPerSecond,
    summary: (summary) => ({
      average: summary.averageRoundThroughput,
      min: summary.minRoundThroughput,
      max: summary.maxRoundThroughput,
    }),
    better: 'higher',
    chipLabel: '最新轮次吞吐',
    bestLabel: '最高轮次吞吐',
    color: {
      line: '#8b5cf6',
      dot: '#7c3aed',
      gradientFrom: 'rgba(139, 92, 246, 0.5)',
      gradientTo: 'rgba(139, 92, 246, 0.05)',
    },
  },
};

export const formatDisplayValue = (type: ChartMetric, value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }

  if (type === 'latency') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${Math.round(value)}ms`;
  }

  return `${value.toFixed(2)} T/s`;
};

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ResultsChartData {
  config: ChartConfig;
  points: ChartPoint[];
  summary: { average?: number; min?: number; max?: number };
  hasData: boolean;
}

export const useResultsChartData = (batch: TestBatch, chartType: ChartMetric): ResultsChartData => {
  const config = CHART_CONFIG[chartType];
  const roundSummaries = useMemo(() => computeRoundSummaries(batch), [batch]);

  const points = useMemo<ChartPoint[]>(() => {
    if (config.roundAccessor) {
      return roundSummaries
        .map((round) => ({
          label: `R${round.roundNumber}`,
          value: config.roundAccessor ? config.roundAccessor(round) : 0,
          success: round.totalRequests > 0,
        }))
        .filter(point => point.success && Number.isFinite(point.value))
        .map(point => ({ label: point.label, value: point.value }));
    }

    if (!config.accessor) {
      return [];
    }

    return batch.results
      .map((result, index) => ({
        label: `#${index + 1}`,
        value: config.accessor ? config.accessor(result) : 0,
        success: result.success,
      }))
      .filter(point => point.success && Number.isFinite(point.value))
      .map(point => ({ label: point.label, value: point.value }));
  }, [batch, config, roundSummaries]);

  const summary = useMemo(() => config.summary(batch.summary), [batch.summary, config]);

  return {
    config,
    points,
    summary,
    hasData: points.length > 0,
  };
};

