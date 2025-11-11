export interface TestConfiguration {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  promptType: string;      // "fixed" or "custom"
  promptLength: number;    // Length of prompt in tokens
  prompt: string;          // Custom prompt (if PromptType is "custom")
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
  id: string;
  timestamp: string;
  configuration: TestConfiguration;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestLatency: number; // in milliseconds
  totalLatency: number;   // in milliseconds
  outputLatency: number;  // in milliseconds
  prefillTokensPerSecond: number;
  outputTokensPerSecond: number;
  tokensPerSecond: number;
  throughput: number;
  error?: string;
  success: boolean;
  response?: string;
}

export interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageLatency: number;  // in milliseconds
  minLatency: number;      // in milliseconds
  maxLatency: number;      // in milliseconds
  averagePrefillLatency: number;
  minPrefillLatency: number;
  maxPrefillLatency: number;
  averageOutputLatency: number;
  minOutputLatency: number;
  maxOutputLatency: number;
  averageTokensPerSecond: number;
  minTokensPerSecond: number;
  maxTokensPerSecond: number;
  averagePrefillTokensPerSecond: number;
  minPrefillTokensPerSecond: number;
  maxPrefillTokensPerSecond: number;
  averageOutputTokensPerSecond: number;
  minOutputTokensPerSecond: number;
  maxOutputTokensPerSecond: number;
  averageThroughput: number;
  minThroughput: number;
  maxThroughput: number;
  errorRate: number;
}

export interface TestBatch {
  id: string;
  startTime: string;
  endTime: string;
  configuration: TestConfiguration;
  results: TestResult[];
  summary: TestSummary;
}

export interface ProgressUpdate {
  testId: string;
  batchId: string;
  testNumber: number;
  totalTests: number;
  status: 'running' | 'completed' | 'failed';
  message?: string;
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

export interface ExportOptions {
  includeCharts?: boolean;
  chartTypes?: string[];
  dateFormat?: string;
}

export type ExportFormat = 'csv' | 'json' | 'png';

export interface ExportRequest {
  batchId: string;
  format: ExportFormat;
  options?: ExportOptions;
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface TestStatus {
  isRunning: boolean;
  progress: number;
  currentTest: number;
  totalTests: number;
  status: string;
  error?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }[];
}
