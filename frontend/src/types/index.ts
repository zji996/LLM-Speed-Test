export interface TestConfiguration {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  promptType: 'random' | 'fixed' | 'custom';
  promptLength: number;
  prompt?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  testCount: number;
  concurrentTests: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface TestResult {
  id?: string;
  timestamp: string;
  configuration: TestConfiguration;
  testNumber: number;
  roundNumber: number;
  roundPosition: number;
  success: boolean;
  error?: string;
  response?: string;
  totalLatency?: number;
  requestLatency?: number; // Prefill
  outputLatency?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  prefillTokensPerSecond?: number;
  outputTokensPerSecond?: number;
  throughput?: number;
}

export interface RoundSummary {
  roundNumber: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate?: number;
  averagePromptTokens?: number;
  averageCompletionTokens?: number;
  averageTotalTokens?: number;
  averagePrefillLatency?: number;
  averageOutputLatency?: number;
  averageTotalLatency?: number;
  averagePrefillTokensPerSecond?: number;
  averageOutputTokensPerSecond?: number;
  totalOutputTokensPerSecond: number;
}

export interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  errorRate: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  averagePrefillLatency: number;
  minPrefillLatency: number;
  maxPrefillLatency: number;
  averageOutputLatency: number;
  minOutputLatency: number;
  maxOutputLatency: number;
  averageThroughput: number;
  minThroughput: number;
  maxThroughput: number;
  averagePrefillTokensPerSecond?: number;
  minPrefillTokensPerSecond?: number;
  maxPrefillTokensPerSecond?: number;
  averageOutputTokensPerSecond?: number;
  minOutputTokensPerSecond?: number;
  maxOutputTokensPerSecond?: number;
  averageRoundThroughput: number;
  minRoundThroughput: number;
  maxRoundThroughput: number;
}

export interface TestBatch {
  id: string;
  startTime: string;
  endTime: string;
  configuration: TestConfiguration;
  results: TestResult[];
  roundSummaries: RoundSummary[];
  summary: TestSummary;
}

export type ExportFormat = 'csv' | 'json' | 'png';

export interface ExportOptions {
  includeCharts?: boolean;
  chartTypes?: string[];
  dateFormat?: string;
}

export interface ProgressUpdate {
  testId: string;
  batchId: string;
  testNumber: number;
  totalTests: number;
  status: 'running' | 'completed' | 'failed';
  message?: string;
}
