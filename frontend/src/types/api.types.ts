import { TestBatch } from './test.types';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ExportFormat {
  value: 'csv' | 'json' | 'png';
  label: string;
}

export interface ExportOptions {
  includeCharts?: boolean;
  chartTypes?: ('latency' | 'throughput' | 'tokens')[];
}

export interface ComparisonResult {
  batches: TestBatch[];
  comparison: ComparisonSummary;
}

export interface ComparisonSummary {
  bestLatencyBatchId: string;
  bestThroughputBatchId: string;
  bestTokensPerSecBatchId: string;
  lowestErrorRateBatchId: string;
}

export interface ProgressUpdate {
  testId: string;
  batchId: string;
  testNumber: number;
  totalTests: number;
  status: 'running' | 'completed' | 'failed';
  message?: string;
}

export interface PromptType {
  value: string;
  label: string;
}

export interface PromptLength {
  value: number;
  label: string;
}