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
	TestCount        int               `json:"testCount"`
	ConcurrentTests  int               `json:"concurrentTests"`
	Timeout          int               `json:"timeout"` // in seconds
	Headers          map[string]string `json:"headers,omitempty"`
}

// TestResult represents the result of a single LLM speed test
type TestResult struct {
	ID                     string            `json:"id"`
	Timestamp              string            `json:"timestamp"`
	Configuration          TestConfiguration `json:"configuration"`
	PromptTokens           int               `json:"promptTokens"`
	CompletionTokens       int               `json:"completionTokens"`
	TotalTokens            int               `json:"totalTokens"`
	RequestLatency         float64           `json:"requestLatency"` // ms
	TotalLatency           float64           `json:"totalLatency"`   // ms
	OutputLatency          float64           `json:"outputLatency"`  // ms spent generating tokens
	PrefillTokensPerSecond float64           `json:"prefillTokensPerSecond"`
	OutputTokensPerSecond  float64           `json:"outputTokensPerSecond"`
	TokensPerSecond        float64           `json:"tokensPerSecond"`
	Throughput             float64           `json:"throughput"` // tokens per second (decode)
	Error                  string            `json:"error,omitempty"`
	Success                bool              `json:"success"`
	Response               string            `json:"response,omitempty"`
}

// TestBatch represents a batch of test results
type TestBatch struct {
	ID            string            `json:"id"`
	StartTime     string            `json:"startTime"`
	EndTime       string            `json:"endTime"`
	Configuration TestConfiguration `json:"configuration"`
	Results       []TestResult      `json:"results"`
	Summary       TestSummary       `json:"summary"`
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
	AverageTokensPerSecond        float64 `json:"averageTokensPerSecond"`
	MinTokensPerSecond            float64 `json:"minTokensPerSecond"`
	MaxTokensPerSecond            float64 `json:"maxTokensPerSecond"`
	AveragePrefillTokensPerSecond float64 `json:"averagePrefillTokensPerSecond"`
	MinPrefillTokensPerSecond     float64 `json:"minPrefillTokensPerSecond"`
	MaxPrefillTokensPerSecond     float64 `json:"maxPrefillTokensPerSecond"`
	AverageOutputTokensPerSecond  float64 `json:"averageOutputTokensPerSecond"`
	MinOutputTokensPerSecond      float64 `json:"minOutputTokensPerSecond"`
	MaxOutputTokensPerSecond      float64 `json:"maxOutputTokensPerSecond"`
	AverageThroughput             float64 `json:"averageThroughput"`
	MinThroughput                 float64 `json:"minThroughput"`
	MaxThroughput                 float64 `json:"maxThroughput"`
	ErrorRate                     float64 `json:"errorRate"`
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
	BestLatencyBatchID      string `json:"bestLatencyBatchId"`
	BestThroughputBatchID   string `json:"bestThroughputBatchId"`
	BestTokensPerSecBatchID string `json:"bestTokensPerSecBatchId"`
	LowestErrorRateBatchID  string `json:"lowestErrorRateBatchId"`
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
