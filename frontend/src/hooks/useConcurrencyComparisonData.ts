import { useMemo } from 'react';
import { TestBatch } from '../types';

export interface ConcurrencyComparisonPoint {
  id: string;
  concurrency: number;
  latency: number;
  throughput: number;
  roundThroughput: number;
  errorRate: number;
  model: string;
}

export interface ConcurrencyComparisonData {
  points: ConcurrencyComparisonPoint[];
  bestConcurrency: ConcurrencyComparisonPoint | null;
}

export const useConcurrencyComparisonData = (batches: TestBatch[]): ConcurrencyComparisonData => {
  const points = useMemo<ConcurrencyComparisonPoint[]>(() => {
    if (!batches || batches.length === 0) return [];
    return batches
      .filter(b => b.results && b.results.length > 0)
      .map(batch => ({
        id: batch.id,
        concurrency: batch.configuration.concurrentTests,
        latency: batch.summary.averageLatency,
        throughput: batch.summary.averageThroughput,
        roundThroughput: batch.summary.averageRoundThroughput,
        errorRate: batch.summary.errorRate * 100,
        model: batch.configuration.model,
      }))
      .sort((a, b) => a.concurrency - b.concurrency);
  }, [batches]);

  const bestConcurrency = useMemo<ConcurrencyComparisonPoint | null>(() => {
    if (points.length < 2) return null;
    const maxThroughput = Math.max(...points.map(d => d.roundThroughput));
    const topTier = points.filter(d => d.roundThroughput >= maxThroughput * 0.95);
    if (topTier.length === 0) return null;
    const sorted = [...topTier].sort((a, b) => a.latency - b.latency);
    return sorted[0] || null;
  }, [points]);

  return {
    points,
    bestConcurrency,
  };
};

