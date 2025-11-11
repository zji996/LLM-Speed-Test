package main

import (
	"fmt"
	"log"
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
		Stream:           true,
		StreamOptions: &StreamOptions{
			IncludeUsage: true,
		},
	}

	// Execute request
	startTime := time.Now()
	response, latency, err := client.GenerateCompletion(request, config.Headers)
	if err != nil && request.Stream {
		log.Printf("Streaming completion failed, retrying without stream: %v", err)
		request.Stream = false
		request.StreamOptions = nil
		response, latency, err = client.GenerateCompletion(request, config.Headers)
	}
	totalLatency := time.Since(startTime)
	totalLatencyMs := float64(totalLatency) / float64(time.Millisecond)
	if totalLatencyMs < 0 {
		totalLatencyMs = 0
	}
	requestLatencyMs := float64(latency) / float64(time.Millisecond)
	if requestLatencyMs < 0 {
		requestLatencyMs = 0
	}
	if requestLatencyMs > totalLatencyMs {
		requestLatencyMs = totalLatencyMs
	}
	outputLatencyMs := totalLatencyMs - requestLatencyMs

	result.TotalLatency = totalLatencyMs
	result.RequestLatency = requestLatencyMs
	result.OutputLatency = outputLatencyMs

	if err != nil {
		result.Error = err.Error()
		return result
	}

	// Calculate metrics
	result.Success = true
	result.PromptTokens = response.Usage.PromptTokens
	result.CompletionTokens = response.Usage.CompletionTokens
	result.TotalTokens = response.Usage.TotalTokens

	if len(response.Choices) > 0 {
		result.Response = response.Choices[0].Message.Content
	}

	if outputLatencyMs <= 0 && (result.PromptTokens > 0 || result.CompletionTokens > 0) {
		prefillMs, outputMs := splitLatencyByTokens(totalLatencyMs, result.PromptTokens, result.CompletionTokens)
		result.RequestLatency = prefillMs
		result.OutputLatency = outputMs
		requestLatencyMs = prefillMs
		outputLatencyMs = outputMs
	}

	result.PrefillTokensPerSecond = computeTokensPerSecond(result.PromptTokens, requestLatencyMs)

	// Output latency might be zero for very small generations - fall back to total latency to avoid division by zero
	outputLatencyForCalc := outputLatencyMs
	if outputLatencyForCalc <= 0 {
		outputLatencyForCalc = totalLatencyMs
	}

	result.OutputTokensPerSecond = computeTokensPerSecond(result.CompletionTokens, outputLatencyForCalc)

	totalLatencySeconds := totalLatencyMs / 1000
	if result.TotalTokens > 0 && totalLatencySeconds > 0 {
		result.TokensPerSecond = float64(result.TotalTokens) / totalLatencySeconds
	}

	// Throughput focuses on decode speed to align with third-party tooling
	result.Throughput = result.OutputTokensPerSecond

	return result
}

func computeTokensPerSecond(tokens int, durationMs float64) float64 {
	if tokens <= 0 || durationMs <= 0 {
		return 0
	}
	return float64(tokens) / (durationMs / 1000.0)
}

func splitLatencyByTokens(totalLatencyMs float64, promptTokens, completionTokens int) (float64, float64) {
	if totalLatencyMs <= 0 {
		return 0, 0
	}

	totalTokens := promptTokens + completionTokens
	if totalTokens <= 0 {
		return totalLatencyMs, 0
	}

	if completionTokens <= 0 {
		return totalLatencyMs, 0
	}

	if promptTokens <= 0 {
		return 0, totalLatencyMs
	}

	promptRatio := float64(promptTokens) / float64(totalTokens)
	const minSegmentRatio = 0.02

	if promptRatio < minSegmentRatio {
		promptRatio = minSegmentRatio
	} else if promptRatio > 1-minSegmentRatio {
		promptRatio = 1 - minSegmentRatio
	}

	prefill := totalLatencyMs * promptRatio
	output := totalLatencyMs - prefill

	if prefill <= 0 {
		prefill = totalLatencyMs * minSegmentRatio
		output = totalLatencyMs - prefill
	}
	if output <= 0 {
		output = totalLatencyMs * minSegmentRatio
		prefill = totalLatencyMs - output
	}

	return prefill, output
}

// calculateSummary calculates summary statistics for a batch of results
func (s *SpeedTestService) calculateSummary(results []TestResult) TestSummary {
	if len(results) == 0 {
		return TestSummary{}
	}

	summary := TestSummary{
		TotalTests: len(results),
	}

	var totalLatency float64
	var totalPrefillLatency float64
	var totalOutputLatency float64
	var totalTokensPerSecond float64
	var totalPrefillTokensPerSecond float64
	var totalOutputTokensPerSecond float64
	var totalThroughput float64

	minLatency := math.MaxFloat64
	maxLatency := 0.0
	minPrefillLatency := math.MaxFloat64
	maxPrefillLatency := 0.0
	minOutputLatency := math.MaxFloat64
	maxOutputLatency := 0.0
	minTokensPerSecond := math.MaxFloat64
	maxTokensPerSecond := 0.0
	minPrefillTokensPerSecond := math.MaxFloat64
	maxPrefillTokensPerSecond := 0.0
	minOutputTokensPerSecond := math.MaxFloat64
	maxOutputTokensPerSecond := 0.0
	minThroughput := math.MaxFloat64
	maxThroughput := 0.0

	validPrefillTPS := 0
	validOutputTPS := 0

	for _, result := range results {
		if result.Success {
			summary.SuccessfulTests++
			totalLatency += result.TotalLatency
			totalPrefillLatency += result.RequestLatency
			totalOutputLatency += result.OutputLatency
			totalTokensPerSecond += result.TokensPerSecond
			totalThroughput += result.Throughput

			if result.TotalLatency < minLatency {
				minLatency = result.TotalLatency
			}
			if result.TotalLatency > maxLatency {
				maxLatency = result.TotalLatency
			}
			if result.RequestLatency < minPrefillLatency {
				minPrefillLatency = result.RequestLatency
			}
			if result.RequestLatency > maxPrefillLatency {
				maxPrefillLatency = result.RequestLatency
			}
			if result.OutputLatency < minOutputLatency {
				minOutputLatency = result.OutputLatency
			}
			if result.OutputLatency > maxOutputLatency {
				maxOutputLatency = result.OutputLatency
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

			if result.PrefillTokensPerSecond > 0 {
				totalPrefillTokensPerSecond += result.PrefillTokensPerSecond
				validPrefillTPS++
				if result.PrefillTokensPerSecond < minPrefillTokensPerSecond {
					minPrefillTokensPerSecond = result.PrefillTokensPerSecond
				}
				if result.PrefillTokensPerSecond > maxPrefillTokensPerSecond {
					maxPrefillTokensPerSecond = result.PrefillTokensPerSecond
				}
			}

			if result.OutputTokensPerSecond > 0 {
				totalOutputTokensPerSecond += result.OutputTokensPerSecond
				validOutputTPS++
				if result.OutputTokensPerSecond < minOutputTokensPerSecond {
					minOutputTokensPerSecond = result.OutputTokensPerSecond
				}
				if result.OutputTokensPerSecond > maxOutputTokensPerSecond {
					maxOutputTokensPerSecond = result.OutputTokensPerSecond
				}
			}
		} else {
			summary.FailedTests++
		}
	}

	if summary.SuccessfulTests > 0 {
		count := float64(summary.SuccessfulTests)
		summary.AverageLatency = totalLatency / count
		summary.MinLatency = minLatency
		summary.MaxLatency = maxLatency
		summary.AveragePrefillLatency = totalPrefillLatency / count
		summary.MinPrefillLatency = minPrefillLatency
		summary.MaxPrefillLatency = maxPrefillLatency
		summary.AverageOutputLatency = totalOutputLatency / count
		summary.MinOutputLatency = minOutputLatency
		summary.MaxOutputLatency = maxOutputLatency
		summary.AverageTokensPerSecond = totalTokensPerSecond / count
		summary.MinTokensPerSecond = minTokensPerSecond
		summary.MaxTokensPerSecond = maxTokensPerSecond
		summary.AverageThroughput = totalThroughput / count
		summary.MinThroughput = minThroughput
		summary.MaxThroughput = maxThroughput

		if validPrefillTPS > 0 {
			summary.AveragePrefillTokensPerSecond = totalPrefillTokensPerSecond / float64(validPrefillTPS)
			summary.MinPrefillTokensPerSecond = minPrefillTokensPerSecond
			summary.MaxPrefillTokensPerSecond = maxPrefillTokensPerSecond
		}

		if validOutputTPS > 0 {
			summary.AverageOutputTokensPerSecond = totalOutputTokensPerSecond / float64(validOutputTPS)
			summary.MinOutputTokensPerSecond = minOutputTokensPerSecond
			summary.MaxOutputTokensPerSecond = maxOutputTokensPerSecond
		}

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
		Batches:    batches,
		Comparison: comparison,
	}, nil
}

// Close closes the service channels
func (s *SpeedTestService) Close() {
	close(s.progressChan)
	close(s.resultsChan)
}
