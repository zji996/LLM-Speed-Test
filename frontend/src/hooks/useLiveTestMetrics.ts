import { useMemo } from 'react';
import { TestResult, TelemetryUpdate } from '../types';
import { MAX_LIVE_CHART_POINTS } from '../utils/constants';

export interface LiveTestChartPoint {
  id: number;
  tps: number;
  latency: number;
}

export interface LiveTestMetrics {
  hasTelemetry: boolean;
  currentTPS: number;
  averageLatency: number;
  successRate: number;
  chartData: LiveTestChartPoint[];
}

export const useLiveTestMetrics = (
  results: TestResult[],
  telemetry?: TelemetryUpdate[]
): LiveTestMetrics => {
  const hasTelemetry = !!(telemetry && telemetry.length > 0);

  const currentTPS = useMemo(() => {
    if (telemetry && telemetry.length > 0) {
      return telemetry[telemetry.length - 1].instantTPS;
    }
    if (results.length === 0) return 0;
    const recent = results.slice(-5);
    const sum = recent.reduce((acc, r) => acc + (r.outputTokensPerSecond || 0), 0);
    return sum / recent.length;
  }, [results, telemetry]);

  const averageLatency = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + (r.totalLatency || 0), 0);
    return sum / results.length;
  }, [results]);

  const successRate = useMemo(() => {
    if (results.length === 0) return 100;
    const success = results.filter(r => r.success).length;
    return (success / results.length) * 100;
  }, [results]);

  const chartData = useMemo<LiveTestChartPoint[]>(() => {
    const startIdx = Math.max(0, results.length - MAX_LIVE_CHART_POINTS);
    return results.slice(-MAX_LIVE_CHART_POINTS).map((r, i) => ({
      id: startIdx + i + 1,
      tps: r.outputTokensPerSecond || 0,
      latency: r.totalLatency || 0,
    }));
  }, [results]);

  return {
    hasTelemetry,
    currentTPS,
    averageLatency,
    successRate,
    chartData,
  };
};

