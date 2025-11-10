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
  averageTokensPerSecond: number;
  minTokensPerSecond: number;
  maxTokensPerSecond: number;
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

export interface TestStatus {
  isRunning: boolean;
  progress: number;
  currentTest: number;
  totalTests: number;
  status: string;
  error?: string;
}