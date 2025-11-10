package main

import (
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
)

// SpeedTestService handles LLM speed testing operations
type SpeedTestService struct {
	progressChan chan ProgressUpdate
	resultsChan  chan TestResult
}

// NewSpeedTestService creates a new speed test service
func NewSpeedTestService() *SpeedTestService {
	return &SpeedTestService{
		progressChan: make(chan ProgressUpdate, 100),
		resultsChan:  make(chan TestResult, 100),
	}
}

// GetProgressChannel returns the progress update channel
func (s *SpeedTestService) GetProgressChannel() <-chan ProgressUpdate {
	return s.progressChan
}

// GetResultsChannel returns the test results channel
func (s *SpeedTestService) GetResultsChannel() <-chan TestResult {
	return s.resultsChan
}

// RunSpeedTest executes a speed test batch
func (s *SpeedTestService) RunSpeedTest(config TestConfiguration) (*TestBatch, error) {
	batchID := uuid.New().String()
	startTime := time.Now().Format(time.RFC3339)

	results := make([]TestResult, 0, config.TestCount)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Create a semaphore to limit concurrent tests
	semaphore := make(chan struct{}, config.ConcurrentTests)

	for i := 0; i < config.TestCount; i++ {
		wg.Add(1)
		go func(testNumber int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Send progress update
			progress := ProgressUpdate{
				TestID:     uuid.New().String(),
				BatchID:    batchID,
				TestNumber: testNumber + 1,
				TotalTests: config.TestCount,
				Status:     "running",
			}
			s.progressChan <- progress

			// Run individual test
			result := s.runIndividualTest(config, testNumber+1)
			result.ID = progress.TestID

			// Update progress
			if result.Success {
				progress.Status = "completed"
			} else {
				progress.Status = "failed"
				progress.Message = result.Error
			}
			s.progressChan <- progress

			// Send result
			mu.Lock()
			results = append(results, result)
			mu.Unlock()
			s.resultsChan <- result

		}(i)
	}

	wg.Wait()
	endTime := time.Now().Format(time.RFC3339)

	// Calculate summary
	summary := s.calculateSummary(results)

	batch := &TestBatch{
		ID:            batchID,
		StartTime:     startTime,
		EndTime:       endTime,
		Configuration: config,
		Results:       results,
		Summary:       summary,
	}

	return batch, nil
}

// runIndividualTest runs a single speed test
func (s *SpeedTestService) runIndividualTest(config TestConfiguration, testNumber int) TestResult {
	result := TestResult{
		Timestamp:     time.Now().Format(time.RFC3339),
		Configuration: config,
		Success:       false,
	}

	// Create OpenAI client
	client := NewOpenAIClient(config.APIEndpoint, config.APIKey, config.Timeout)

	// Generate prompt based on configuration
	var promptContent string
	if config.PromptType == "custom" && config.Prompt != "" {
		promptContent = config.Prompt
	} else {
		promptGen := NewPromptGenerator()
		promptContent = promptGen.GeneratePrompt(config.PromptLength, config.PromptType)
	}

	// Prepare request
	request := OpenAIRequest{
		Model:            config.Model,
		Messages:         []Message{{Role: "user", Content: promptContent}},
		MaxTokens:        config.MaxTokens,
		Temperature:      config.Temperature,
		TopP:             config.TopP,
		PresencePenalty:  config.PresencePenalty,
		FrequencyPenalty: config.FrequencyPenalty,
		Stream:           false,
	}

	// Execute request
	startTime := time.Now()
	response, latency, err := client.GenerateCompletion(request, config.Headers)
	totalLatency := time.Since(startTime)

	if err != nil {
		result.Error = err.Error()
		result.TotalLatency = totalLatency
		return result
	}

	// Calculate metrics
	result.Success = true
	result.RequestLatency = latency
	result.TotalLatency = totalLatency
	result.PromptTokens = response.Usage.PromptTokens
	result.CompletionTokens = response.Usage.CompletionTokens
	result.TotalTokens = response.Usage.TotalTokens

	if len(response.Choices) > 0 {
		result.Response = response.Choices[0].Message.Content
	}

	// Calculate tokens per second and throughput
	if result.TotalTokens > 0 && totalLatency.Seconds() > 0 {
		result.TokensPerSecond = float64(result.TotalTokens) / totalLatency.Seconds()
		result.Throughput = result.TokensPerSecond
	}

	return result
}

// calculateSummary calculates summary statistics for a batch of results
func (s *SpeedTestService) calculateSummary(results []TestResult) TestSummary {
	if len(results) == 0 {
		return TestSummary{}
	}

	summary := TestSummary{
		TotalTests: len(results),
	}

	var totalLatency time.Duration
	var totalTokensPerSecond, totalThroughput float64
	var minLatency, maxLatency time.Duration = time.Hour, 0
	var minTokensPerSecond, maxTokensPerSecond = math.MaxFloat64, 0.0
	var minThroughput, maxThroughput = math.MaxFloat64, 0.0

	for _, result := range results {
		if result.Success {
			summary.SuccessfulTests++
			totalLatency += result.TotalLatency
			totalTokensPerSecond += result.TokensPerSecond
			totalThroughput += result.Throughput

			// Update min/max values
			if result.TotalLatency < minLatency {
				minLatency = result.TotalLatency
			}
			if result.TotalLatency > maxLatency {
				maxLatency = result.TotalLatency
			}
			if result.TokensPerSecond < minTokensPerSecond {
				minTokensPerSecond = result.TokensPerSecond
			}
			if result.TokensPerSecond > maxTokensPerSecond {
				maxTokensPerSecond = result.TokensPerSecond
			}
			if result.Throughput < minThroughput {
				minThroughput = result.Throughput
			}
			if result.Throughput > maxThroughput {
				maxThroughput = result.Throughput
			}
		} else {
			summary.FailedTests++
		}
	}

	if summary.SuccessfulTests > 0 {
		summary.AverageLatency = totalLatency / time.Duration(summary.SuccessfulTests)
		summary.MinLatency = minLatency
		summary.MaxLatency = maxLatency
		summary.AverageTokensPerSecond = totalTokensPerSecond / float64(summary.SuccessfulTests)
		summary.MinTokensPerSecond = minTokensPerSecond
		summary.MaxTokensPerSecond = maxTokensPerSecond
		summary.AverageThroughput = totalThroughput / float64(summary.SuccessfulTests)
		summary.MinThroughput = minThroughput
		summary.MaxThroughput = maxThroughput
		summary.ErrorRate = float64(summary.FailedTests) / float64(summary.TotalTests)
	}

	return summary
}

// CompareBatches compares multiple test batches
func (s *SpeedTestService) CompareBatches(batches []TestBatch) (*ComparisonResult, error) {
	if len(batches) < 2 {
		return nil, fmt.Errorf("need at least 2 batches to compare")
	}

	comparison := ComparisonSummary{}

	// Find best performing batches
	bestLatencyBatch := batches[0]
	bestThroughputBatch := batches[0]
	bestTokensPerSecBatch := batches[0]
	lowestErrorRateBatch := batches[0]

	for _, batch := range batches {
		if batch.Summary.AverageLatency < bestLatencyBatch.Summary.AverageLatency {
			bestLatencyBatch = batch
		}
		if batch.Summary.AverageThroughput > bestThroughputBatch.Summary.AverageThroughput {
			bestThroughputBatch = batch
		}
		if batch.Summary.AverageTokensPerSecond > bestTokensPerSecBatch.Summary.AverageTokensPerSecond {
			bestTokensPerSecBatch = batch
		}
		if batch.Summary.ErrorRate < lowestErrorRateBatch.Summary.ErrorRate {
			lowestErrorRateBatch = batch
		}
	}

	comparison.BestLatencyBatchID = bestLatencyBatch.ID
	comparison.BestThroughputBatchID = bestThroughputBatch.ID
	comparison.BestTokensPerSecBatchID = bestTokensPerSecBatch.ID
	comparison.LowestErrorRateBatchID = lowestErrorRateBatch.ID

	return &ComparisonResult{
		Batches:   batches,
		Comparison: comparison,
	}, nil
}

// Close closes the service channels
func (s *SpeedTestService) Close() {
	close(s.progressChan)
	close(s.resultsChan)
}