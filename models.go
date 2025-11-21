package main

// TestConfiguration represents the configuration for a speed test
type TestConfiguration struct {
	APIEndpoint      string            `json:"apiEndpoint"`
	APIKey           string            `json:"apiKey"`
	Model            string            `json:"model"`
	PromptType       string            `json:"promptType"`   // "fixed" or "custom"
	PromptLength     int               `json:"promptLength"` // Length of prompt in tokens
	Prompt           string            `json:"prompt"`       // Custom prompt (if PromptType is "custom")
	MaxTokens        int               `json:"maxTokens"`
	Temperature      float32           `json:"temperature"`
	TopP             float32           `json:"topP"`
	PresencePenalty  float32           `json:"presencePenalty"`
	FrequencyPenalty float32           `json:"frequencyPenalty"`
	
	// Test Mode Configuration
	TestMode   string            `json:"testMode"`   // "normal", "concurrency_step", "input_step"
	StepConfig StepConfiguration `json:"stepConfig"` // Configuration for step tests

	TestCount        int               `json:"testCount"`       // Number of submission rounds (per step)
	ConcurrentTests  int               `json:"concurrentTests"` // Requests per round (base or fixed)
	Timeout          int               `json:"timeout"`         // in seconds
	Headers          map[string]string `json:"headers,omitempty"`
}

// StepConfiguration defines parameters for step-based tests
type StepConfiguration struct {
	Start int `json:"start"`
	End   int `json:"end"`
	Step  int `json:"step"`
}

// TestResult represents the result of a single LLM speed test
type TestResult struct {
	ID                     string            `json:"id"`
	Timestamp              string            `json:"timestamp"`
	Configuration          TestConfiguration `json:"configuration"`
	TestNumber             int               `json:"testNumber"`
	RoundNumber            int               `json:"roundNumber"`
	RoundPosition          int               `json:"roundPosition"`
	ActualConcurrency      int               `json:"actualConcurrency"` // The concurrency level for this specific result
	PromptTokens           int               `json:"promptTokens"`
	CompletionTokens       int               `json:"completionTokens"`
	TotalTokens            int               `json:"totalTokens"`
	RequestLatency         float64           `json:"requestLatency"` // ms
	TotalLatency           float64           `json:"totalLatency"`   // ms
	OutputLatency          float64           `json:"outputLatency"`  // ms spent generating tokens
	PrefillTokensPerSecond float64           `json:"prefillTokensPerSecond"`
	OutputTokensPerSecond  float64           `json:"outputTokensPerSecond"`
	Throughput             float64           `json:"throughput"` // tokens per second (decode)
	Error                  string            `json:"error,omitempty"`
	Success                bool              `json:"success"`
	Response               string            `json:"response,omitempty"`
}

// TestBatch represents a batch of test results
type TestBatch struct {
	ID             string            `json:"id"`
	StartTime      string            `json:"startTime"`
	EndTime        string            `json:"endTime"`
	Configuration  TestConfiguration `json:"configuration"`
	Results        []TestResult      `json:"results"`
	RoundSummaries []RoundSummary    `json:"roundSummaries,omitempty"`
	Summary        TestSummary       `json:"summary"`
}

// TestSummary provides aggregated statistics for a test batch
type TestSummary struct {
	TotalTests                    int     `json:"totalTests"`
	SuccessfulTests               int     `json:"successfulTests"`
	FailedTests                   int     `json:"failedTests"`
	AverageLatency                float64 `json:"averageLatency"`
	MinLatency                    float64 `json:"minLatency"`
	MaxLatency                    float64 `json:"maxLatency"`
	AveragePrefillLatency         float64 `json:"averagePrefillLatency"`
	MinPrefillLatency             float64 `json:"minPrefillLatency"`
	MaxPrefillLatency             float64 `json:"maxPrefillLatency"`
	AverageOutputLatency          float64 `json:"averageOutputLatency"`
	MinOutputLatency              float64 `json:"minOutputLatency"`
	MaxOutputLatency              float64 `json:"maxOutputLatency"`
	AveragePrefillTokensPerSecond float64 `json:"averagePrefillTokensPerSecond"`
	MinPrefillTokensPerSecond     float64 `json:"minPrefillTokensPerSecond"`
	MaxPrefillTokensPerSecond     float64 `json:"maxPrefillTokensPerSecond"`
	AverageOutputTokensPerSecond  float64 `json:"averageOutputTokensPerSecond"`
	MinOutputTokensPerSecond      float64 `json:"minOutputTokensPerSecond"`
	MaxOutputTokensPerSecond      float64 `json:"maxOutputTokensPerSecond"`
	AverageThroughput             float64 `json:"averageThroughput"`
	MinThroughput                 float64 `json:"minThroughput"`
	MaxThroughput                 float64 `json:"maxThroughput"`
	AverageRoundThroughput        float64 `json:"averageRoundThroughput"`
	MinRoundThroughput            float64 `json:"minRoundThroughput"`
	MaxRoundThroughput            float64 `json:"maxRoundThroughput"`
	ErrorRate                     float64 `json:"errorRate"`
}

// RoundSummary captures aggregated metrics for a single test round
type RoundSummary struct {
	RoundNumber                   int     `json:"roundNumber"`
	TotalRequests                 int     `json:"totalRequests"`
	SuccessfulRequests            int     `json:"successfulRequests"`
	FailedRequests                int     `json:"failedRequests"`
	SuccessRate                   float64 `json:"successRate"`
	AveragePromptTokens           float64 `json:"averagePromptTokens"`
	AverageCompletionTokens       float64 `json:"averageCompletionTokens"`
	AverageTotalTokens            float64 `json:"averageTotalTokens"`
	AveragePrefillLatency         float64 `json:"averagePrefillLatency"`
	AverageOutputLatency          float64 `json:"averageOutputLatency"`
	AverageTotalLatency           float64 `json:"averageTotalLatency"`
	AveragePrefillTokensPerSecond float64 `json:"averagePrefillTokensPerSecond"`
	TotalPrefillTokensPerSecond   float64 `json:"totalPrefillTokensPerSecond"`
	AverageOutputTokensPerSecond  float64 `json:"averageOutputTokensPerSecond"`
	TotalOutputTokensPerSecond    float64 `json:"totalOutputTokensPerSecond"`
}

// ProgressUpdate represents a progress update during test execution
type ProgressUpdate struct {
	TestID     string `json:"testId"`
	BatchID    string `json:"batchId"`
	TestNumber int    `json:"testNumber"`
	TotalTests int    `json:"totalTests"`
	Status     string `json:"status"` // "running", "completed", "failed"
	Message    string `json:"message,omitempty"`
}

// TelemetryUpdate represents real-time telemetry data during test execution
type TelemetryUpdate struct {
	Timestamp            int64   `json:"timestamp"`            // Unix timestamp in ms
	ActiveTests          int     `json:"activeTests"`          // Current number of active requests
	CompletedTests       int     `json:"completedTests"`       // Number of completed requests
	TotalTests           int     `json:"totalTests"`           // Total expected requests
	GeneratedTokens      int64   `json:"generatedTokens"`      // Total tokens generated so far
	InstantTPS           float64 `json:"instantTPS"`           // Instantaneous tokens per second
	AverageTTFT          float64 `json:"averageTTFT"`          // Average Time To First Token (ms)
	P95TTFT              float64 `json:"p95TTFT"`              // 95th percentile TTFT (ms)
	StepCurrent          int     `json:"stepCurrent"`          // Current step index (for step tests)
	StepTotal            int     `json:"stepTotal"`            // Total steps (for step tests)
}

// ComparisonRequest represents a request to compare multiple test batches
type ComparisonRequest struct {
	BatchIDs []string `json:"batchIds"`
}

// ComparisonResult represents the result of comparing multiple test batches
type ComparisonResult struct {
	Batches    []TestBatch       `json:"batches"`
	Comparison ComparisonSummary `json:"comparison"`
}

// ComparisonSummary provides comparison statistics
type ComparisonSummary struct {
	BestLatencyBatchID         string `json:"bestLatencyBatchId"`
	BestThroughputBatchID      string `json:"bestThroughputBatchId"`
	BestRoundThroughputBatchID string `json:"bestRoundThroughputBatchId"`
	LowestErrorRateBatchID     string `json:"lowestErrorRateBatchId"`
}

// ExportFormat represents the format for data export
type ExportFormat string

const (
	ExportFormatCSV  ExportFormat = "csv"
	ExportFormatJSON ExportFormat = "json"
	ExportFormatPNG  ExportFormat = "png"
)

// ExportRequest represents a request to export test data
type ExportRequest struct {
	BatchID string        `json:"batchId"`
	Format  ExportFormat  `json:"format"`
	Options ExportOptions `json:"options,omitempty"`
}

// ExportOptions provides additional options for export
type ExportOptions struct {
	IncludeCharts bool     `json:"includeCharts"`
	ChartTypes    []string `json:"chartTypes,omitempty"`
	DateFormat    string   `json:"dateFormat,omitempty"`
}
