export type TestMode = 'normal' | 'concurrency_step' | 'input_step';

export interface StepConfiguration {
  start: number;
  end: number;
  step: number;
}

export interface SavedApiConfig {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
}

export interface TestConfiguration {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  promptType: string;      // "fixed" or "custom"
  promptLength: number;    // Length of prompt in tokens
  prompt: string;          // Custom prompt content (if enabled)
  maxTokens: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;

  // Test mode & step configuration
  testMode: TestMode;
  stepConfig: StepConfiguration;

  testCount: number;       // Number of submission rounds (per step when stepped)
  concurrentTests: number; // Requests per round (base/fixed concurrency)
  timeout: number;         // Timeout in seconds
  headers?: Record<string, string>;
}

export interface PersistedTestState {
  config: TestConfiguration;
  mode: TestMode;
  concurrencyStepConfig: StepConfiguration;
  concurrencyStepCount: number;
  inputStepConfig: StepConfiguration;
  inputStepCount: number;
}

export interface PersistedAppConfig {
  testState?: PersistedTestState;
  savedApiConfigs?: SavedApiConfig[];
  lastValidApiEndpoint?: string;
  lastValidApiKey?: string;
}

export interface TestResult {
  id: string;
  timestamp: string;
  configuration: TestConfiguration;
  testNumber: number;
  roundNumber: number;
  roundPosition: number;
  actualConcurrency: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestLatency: number; // in milliseconds
  totalLatency: number;   // in milliseconds
  outputLatency: number;  // in milliseconds
  prefillTokensPerSecond: number;
  outputTokensPerSecond: number;
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
  averagePrefillTokensPerSecond: number;
  minPrefillTokensPerSecond: number;
  maxPrefillTokensPerSecond: number;
  averageOutputTokensPerSecond: number;
  minOutputTokensPerSecond: number;
  maxOutputTokensPerSecond: number;
  averageThroughput: number;
  minThroughput: number;
  maxThroughput: number;
  averageRoundThroughput: number;
  minRoundThroughput: number;
  maxRoundThroughput: number;
  errorRate: number;
}

export interface RoundSummary {
  roundNumber: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averagePromptTokens: number;
  averageCompletionTokens: number;
  averageTotalTokens: number;
  averagePrefillLatency: number;
  averageOutputLatency: number;
  averageTotalLatency: number;
  averagePrefillTokensPerSecond: number;
  totalPrefillTokensPerSecond: number;
  averageOutputTokensPerSecond: number;
  totalOutputTokensPerSecond: number;
}

export interface TestBatch {
  id: string;
  startTime: string;
  endTime: string;
  configuration: TestConfiguration;
  results: TestResult[];
  roundSummaries?: RoundSummary[];
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
  bestRoundThroughputBatchId: string;
  lowestErrorRateBatchId: string;
}

export interface ExportOptions {
  includeCharts?: boolean;
  chartTypes?: ('latency' | 'throughput' | 'roundThroughput')[];
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

export interface TelemetryUpdate {
  timestamp: number;           // Unix timestamp in ms
  activeTests: number;         // Current number of active requests
  completedTests: number;      // Number of completed requests
  totalTests: number;          // Total expected requests
  generatedTokens: number;     // Total tokens generated so far
  instantTPS: number;          // Instantaneous tokens per second
  averageTTFT: number;         // Average time to first token (ms)
  p95TTFT: number;             // 95th percentile TTFT (ms)
  stepCurrent: number;         // Current step index (for step tests)
  stepTotal: number;           // Total steps (for step tests)
}
