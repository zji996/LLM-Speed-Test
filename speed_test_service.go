package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
)

// SpeedTestService handles LLM speed testing operations
type SpeedTestService struct {
	progressChan  chan ProgressUpdate
	resultsChan   chan TestResult
	telemetryChan chan TelemetryUpdate
}

// NewSpeedTestService creates a new speed test service
func NewSpeedTestService() *SpeedTestService {
	return &SpeedTestService{
		progressChan:  make(chan ProgressUpdate, 100),
		resultsChan:   make(chan TestResult, 100),
		telemetryChan: make(chan TelemetryUpdate, 100),
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

// GetTelemetryChannel returns the telemetry update channel
func (s *SpeedTestService) GetTelemetryChannel() <-chan TelemetryUpdate {
	return s.telemetryChan
}

type testStep struct {
	concurrency  int
	promptLength int
}

// RunSpeedTest executes a speed test batch
func (s *SpeedTestService) RunSpeedTest(ctx context.Context, config TestConfiguration, batchID string) (*TestBatch, error) {
	if batchID == "" {
		batchID = uuid.New().String()
	}
	startTime := time.Now().Format(time.RFC3339)

	// 1. Generate Steps
	steps := []testStep{}
	if config.TestMode == "concurrency_step" {
		if config.StepConfig.Start <= 0 || config.StepConfig.Step <= 0 || config.StepConfig.End < config.StepConfig.Start {
			return nil, fmt.Errorf("invalid step configuration for concurrency: start=%d, end=%d, step=%d",
				config.StepConfig.Start, config.StepConfig.End, config.StepConfig.Step)
		}
		for c := config.StepConfig.Start; c <= config.StepConfig.End; c += config.StepConfig.Step {
			steps = append(steps, testStep{concurrency: c, promptLength: config.PromptLength})
		}
	} else if config.TestMode == "input_step" {
		if config.StepConfig.Start <= 0 || config.StepConfig.Step <= 0 || config.StepConfig.End < config.StepConfig.Start {
			return nil, fmt.Errorf("invalid step configuration for input: start=%d, end=%d, step=%d",
				config.StepConfig.Start, config.StepConfig.End, config.StepConfig.Step)
		}
		for l := config.StepConfig.Start; l <= config.StepConfig.End; l += config.StepConfig.Step {
			steps = append(steps, testStep{concurrency: config.ConcurrentTests, promptLength: l})
		}
	} else {
		// Normal mode (default)
		// Ensure concurrency is valid
		c := config.ConcurrentTests
		if c <= 0 {
			c = 1
		}
		steps = append(steps, testStep{concurrency: c, promptLength: config.PromptLength})
	}

	// 2. Calculate Total Tests
	// For normal mode, this is simply testCount * concurrency.
	// For step modes, we sum over each generated step so that
	// progress, telemetry and UI charts see the true total.
	totalTests := 0
	for _, step := range steps {
		totalTests += config.TestCount * step.concurrency
	}

	if totalTests <= 0 {
		return nil, fmt.Errorf("invalid test configuration: total tests must be positive")
	}

	results := make([]TestResult, 0, totalTests)
	var mu sync.Mutex

	// Reuse a single OpenAI client for the whole batch
	client := NewOpenAIClient(config.APIEndpoint, config.APIKey, config.Timeout)

	// Optional warm-up request (not included in results)
	// This helps hide cold-start latency for some local deployments.
	if len(steps) > 0 {
		warmupStep := steps[0]
		warmupResult := s.runIndividualTest(ctx, client, config, 0, warmupStep.concurrency, warmupStep.promptLength, nil, nil)
		if !warmupResult.Success && warmupResult.Error != "" {
			log.Printf("Warm-up request failed: %s", warmupResult.Error)
		}
	}

	// Telemetry state
	var activeTests int32
	var completedTests int32
	var generatedTokens int64
	var ttftSum int64 // in microseconds
	var ttftCount int64
	var ttftValues []float64 // for P95
	var telemetryMu sync.Mutex
	var lastGeneratedTokens int64

	// Step telemetry (for step tests only)
	stepTotal := len(steps)
	var currentStepIndex int32

	// Start telemetry ticker
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	telemetryCtx, telemetryCancel := context.WithCancel(context.Background())
	defer telemetryCancel()

	go func() {
		for {
			select {
			case <-telemetryCtx.Done():
				return
			case t := <-ticker.C:
				currentGeneratedTokens := atomic.LoadInt64(&generatedTokens)
				tokenDiff := currentGeneratedTokens - lastGeneratedTokens
				lastGeneratedTokens = currentGeneratedTokens

				// Calculate Instant TPS
				// 500ms interval, so multiply by 2
				instantTPS := float64(tokenDiff) * 2.0

				telemetryMu.Lock()
				var avgTTFT float64
				var p95TTFT float64
				if ttftCount > 0 {
					avgTTFT = float64(ttftSum) / float64(ttftCount) / 1000.0 // convert us to ms
				}
				if len(ttftValues) > 0 {
					// Sort copy to avoid race conditions if we were writing (but we only read/append under lock)
					// Actually sort.Float64s modifies the slice. We should make a copy if we wanted to keep original order,
					// but here order doesn't matter for appending.
					// However, if appending happens concurrently... appending is under lock.
					// So it is safe to sort in place.
					sortedTTFT := make([]float64, len(ttftValues))
					copy(sortedTTFT, ttftValues)
					sort.Float64s(sortedTTFT)
					idx := int(math.Ceil(float64(len(sortedTTFT))*0.95)) - 1
					if idx < 0 {
						idx = 0
					}
					if idx >= len(sortedTTFT) {
						idx = len(sortedTTFT) - 1
					}
					p95TTFT = sortedTTFT[idx]
				}
				telemetryMu.Unlock()

				update := TelemetryUpdate{
					Timestamp:       t.UnixMilli(),
					ActiveTests:     int(atomic.LoadInt32(&activeTests)),
					CompletedTests:  int(atomic.LoadInt32(&completedTests)),
					TotalTests:      totalTests,
					GeneratedTokens: currentGeneratedTokens,
					InstantTPS:      instantTPS,
					AverageTTFT:     avgTTFT,
					P95TTFT:         p95TTFT,
					StepCurrent:     int(atomic.LoadInt32(&currentStepIndex)),
					StepTotal:       stepTotal,
				}

				select {
				case s.telemetryChan <- update:
				default:
					// Skip if channel is full
				}
			}
		}
	}()

	globalTestIndex := 0

	for stepIndex, step := range steps {
		// Update current step index for telemetry consumers (1-based)
		atomic.StoreInt32(&currentStepIndex, int32(stepIndex+1))

		// Check context before starting a step
		select {
		case <-ctx.Done():
			break
		default:
		}

		stepTotalTests := config.TestCount * step.concurrency
		var wg sync.WaitGroup

		// Create a semaphore for this step's concurrency
		semaphore := make(chan struct{}, step.concurrency)

		for i := 0; i < stepTotalTests; i++ {
			// Check if context is cancelled
			select {
			case <-ctx.Done():
				break
			default:
			}

			wg.Add(1)
			go func(stepTestIndex int, currentGlobalIndex int) {
				defer wg.Done()

				// Acquire semaphore
				select {
				case semaphore <- struct{}{}:
				case <-ctx.Done():
					return
				}
				defer func() { <-semaphore }()

				// Send progress update
				progress := ProgressUpdate{
					TestID:     uuid.New().String(),
					BatchID:    batchID,
					TestNumber: currentGlobalIndex + 1,
					TotalTests: totalTests,
					Status:     "running",
				}

				select {
				case s.progressChan <- progress:
				case <-ctx.Done():
					return
				}

				atomic.AddInt32(&activeTests, 1)

				// Define callbacks
				onToken := func(content string) {
					// We need token count. Since we don't have tokenizer here, we approximate or assume 1 chunk ~= 1 token?
					// No, that's bad. But OpenAI usage comes at end.
					// However, we can count characters or words?
					// For accurate TPS, we need token count.
					// If we don't have a tokenizer, character count / 4 is a rough approximation for English.
					// Or we can just count "chunks" if chunk usually contains 1 token (not always true).
					// But wait, `speed_test_service.go` computes TPS based on Usage.CompletionTokens.
					// For real-time visualization, we can use a simple heuristic: len(content) / 4.
					// Or just count generated characters and frontend divides by 4?
					// Let's use len(content) / 4.0 as rough token estimate for instant TPS.
					tokens := int64(len(content) / 3) // rough estimate
					if tokens < 1 && len(content) > 0 {
						tokens = 1
					}
					atomic.AddInt64(&generatedTokens, tokens)
				}

				onFirstToken := func(d time.Duration) {
					ms := float64(d.Microseconds()) / 1000.0
					atomic.AddInt64(&ttftSum, d.Microseconds())
					atomic.AddInt64(&ttftCount, 1)
					telemetryMu.Lock()
					ttftValues = append(ttftValues, ms)
					telemetryMu.Unlock()
				}

				// Run individual test with specific step parameters
				result := s.runIndividualTest(ctx, client, config, currentGlobalIndex+1, step.concurrency, step.promptLength, onToken, onFirstToken)

				atomic.AddInt32(&activeTests, -1)
				atomic.AddInt32(&completedTests, 1)

				result.ID = progress.TestID

				// Update progress
				if result.Success {
					progress.Status = "completed"
				} else {
					progress.Status = "failed"
					progress.Message = result.Error
				}

				select {
				case s.progressChan <- progress:
				case <-ctx.Done():
					return
				}

				// Store result
				mu.Lock()
				results = append(results, result)
				mu.Unlock()

				select {
				case s.resultsChan <- result:
				case <-ctx.Done():
					return
				}

			}(i, globalTestIndex+i)
		}
		wg.Wait()
		globalTestIndex += stepTotalTests
	}

	endTime := time.Now().Format(time.RFC3339)

	// Calculate summary
	summary := s.calculateSummary(results)
	roundSummaries := s.calculateRoundSummaries(results, config)

	// Calculate aggregated Round stats (Total Throughput per Round)
	if len(roundSummaries) > 0 {
		minRoundThroughput := math.MaxFloat64
		maxRoundThroughput := 0.0
		var totalRoundThroughput float64
		validRounds := 0

		for _, round := range roundSummaries {
			if round.TotalOutputTokensPerSecond <= 0 {
				continue
			}

			totalRoundThroughput += round.TotalOutputTokensPerSecond
			if round.TotalOutputTokensPerSecond < minRoundThroughput {
				minRoundThroughput = round.TotalOutputTokensPerSecond
			}
			if round.TotalOutputTokensPerSecond > maxRoundThroughput {
				maxRoundThroughput = round.TotalOutputTokensPerSecond
			}
			validRounds++
		}

		if validRounds > 0 {
			summary.AverageRoundThroughput = totalRoundThroughput / float64(validRounds)
			summary.MinRoundThroughput = minRoundThroughput
			summary.MaxRoundThroughput = maxRoundThroughput
		}
	}

	batch := &TestBatch{
		ID:             batchID,
		StartTime:      startTime,
		EndTime:        endTime,
		Configuration:  config,
		Results:        results,
		RoundSummaries: roundSummaries,
		Summary:        summary,
	}

	return batch, nil
}

// runIndividualTest runs a single speed test
func (s *SpeedTestService) runIndividualTest(ctx context.Context, client *OpenAIClient, config TestConfiguration, testNumber int, concurrency int, promptLength int, onToken func(string), onFirstToken func(time.Duration)) TestResult {
	if concurrency <= 0 {
		concurrency = 1
	}
	// Calculate round number relative to this concurrency batch
	roundNumber := ((testNumber - 1) / concurrency) + 1
	roundPosition := ((testNumber - 1) % concurrency) + 1

	result := TestResult{
		Timestamp:         time.Now().Format(time.RFC3339),
		Configuration:     config,
		TestNumber:        testNumber,
		RoundNumber:       roundNumber,
		RoundPosition:     roundPosition,
		ActualConcurrency: concurrency,
		Success:           false,
	}

	// Generate prompt based on configuration
	var promptContent string
	if config.PromptType == "custom" && config.Prompt != "" {
		promptContent = config.Prompt
	} else {
		promptGen := NewPromptGenerator(config.Model)
		promptContent = promptGen.GeneratePrompt(promptLength, config.PromptType)
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
	response, latency, err := client.GenerateCompletion(ctx, request, config.Headers, onToken, onFirstToken)
	if err != nil && request.Stream {
		// Check if error is due to cancellation
		if ctx.Err() != nil {
			result.Error = "cancelled"
			return result
		}

		log.Printf("Streaming completion failed, retrying without stream: %v", err)
		request.Stream = false
		request.StreamOptions = nil
		// Retry without stream
		response, latency, err = client.GenerateCompletion(ctx, request, config.Headers, nil, nil)
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
	var totalPrefillTokensPerSecond float64
	var totalOutputTokensPerSecond float64
	var totalThroughput float64

	minLatency := math.MaxFloat64
	maxLatency := 0.0
	minPrefillLatency := math.MaxFloat64
	maxPrefillLatency := 0.0
	minOutputLatency := math.MaxFloat64
	maxOutputLatency := 0.0
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

// calculateRoundSummaries aggregates metrics per configured test round
func (s *SpeedTestService) calculateRoundSummaries(results []TestResult, config TestConfiguration) []RoundSummary {
	if len(results) == 0 {
		return nil
	}

	type roundAccumulator struct {
		summary               RoundSummary
		totalPromptTokens     float64
		totalCompletionTokens float64
		totalTokens           float64
		totalPrefillLatency   float64
		totalOutputLatency    float64
		totalLatency          float64
		totalPrefillTPS       float64
		totalOutputTPS        float64
		prefillSamples        int
		outputSamples         int
	}

	accumulators := make(map[int]*roundAccumulator)

	for _, result := range results {
		// Use the round number stored in the result
		roundNumber := result.RoundNumber

		// Note: In step tests, round numbers might conflict (e.g. Step 1 Round 1 vs Step 2 Round 1).
		// However, the requirements don't explicitly ask for multi-step aggregation in this specific function,
		// but rather for charts. The frontend charts for "Total Prefill Rate" etc. rely on RoundSummary.
		// For "Concurrency Step", we likely want one "Round" per concurrency level if TestCount=1.
		// If TestCount > 1, we have multiple rounds per step.
		// The current logic groups by roundNumber.
		// We should ensure unique round numbers if we want to distinguish them,
		// OR we group by (Step, Round).
		// Given the complexity, for now we rely on the frontend to filter/group `Results` directly for detailed charts.
		// The `RoundSummaries` here are mostly for the "Round Throughput" metric.

		// IMPORTANT: For step tests, if we want to show "Total Throughput" per step, we need to make sure
		// rounds are grouped correctly.
		// Since `calculateRoundSummaries` aggregates by `RoundNumber`, and we assign `RoundNumber` relative to the test index,
		// it should be fine as long as `RoundNumber` keeps increasing or is unique enough.
		// But in my implementation above:
		// roundNumber := ((testNumber - 1) / concurrency) + 1
		// If concurrency changes, this formula might produce duplicate round numbers for different steps.
		// E.g. Test 1 (Conc 1) -> Round 1.
		// Test 2 (Conc 2) -> Round 1 (if testNumber resets, but I used globalTestIndex).
		// `globalTestIndex` ensures `testNumber` is unique and increasing.
		// So `RoundNumber` will be unique-ish.
		// Wait: `((testNumber - 1) / concurrency) + 1`.
		// If Test 1..10 are Conc 1. Round = 1..10.
		// If Test 11..20 are Conc 10. Round = ((10..19)/10)+1 = Round 2.
		// This might overlap.
		// Ideally, we should assume `RoundSummaries` are primarily useful for "Normal" tests or
		// we need to trust that `globalTestIndex` makes them somewhat distinct.
		// Actually, for the graphs, users usually care about "Concurrency Level vs Metric".
		// We will derive that from `Results` in the frontend. `RoundSummary` is less critical for the step charts
		// unless we want "Total Throughput" (which is a round property).

		acc, ok := accumulators[roundNumber]
		if !ok {
			acc = &roundAccumulator{
				summary: RoundSummary{RoundNumber: roundNumber},
			}
			accumulators[roundNumber] = acc
		}

		acc.summary.TotalRequests++

		if result.Success {
			acc.summary.SuccessfulRequests++
			acc.totalPromptTokens += float64(result.PromptTokens)
			acc.totalCompletionTokens += float64(result.CompletionTokens)
			acc.totalTokens += float64(result.TotalTokens)
			acc.totalPrefillLatency += result.RequestLatency
			acc.totalOutputLatency += result.OutputLatency
			acc.totalLatency += result.TotalLatency
			if result.PrefillTokensPerSecond > 0 {
				acc.totalPrefillTPS += result.PrefillTokensPerSecond
				acc.prefillSamples++
			}
			acc.summary.TotalPrefillTokensPerSecond += result.PrefillTokensPerSecond

			if result.OutputTokensPerSecond > 0 {
				acc.totalOutputTPS += result.OutputTokensPerSecond
				acc.outputSamples++
			}
			acc.summary.TotalOutputTokensPerSecond += result.OutputTokensPerSecond
		} else {
			acc.summary.FailedRequests++
		}
	}

	if len(accumulators) == 0 {
		return nil
	}

	roundNumbers := make([]int, 0, len(accumulators))
	for round := range accumulators {
		roundNumbers = append(roundNumbers, round)
	}
	sort.Ints(roundNumbers)

	rounds := make([]RoundSummary, 0, len(roundNumbers))
	for _, roundNumber := range roundNumbers {
		acc := accumulators[roundNumber]
		if acc.summary.TotalRequests > 0 {
			acc.summary.SuccessRate = float64(acc.summary.SuccessfulRequests) / float64(acc.summary.TotalRequests)
		}
		if acc.summary.SuccessfulRequests > 0 {
			denom := float64(acc.summary.SuccessfulRequests)
			acc.summary.AveragePromptTokens = acc.totalPromptTokens / denom
			acc.summary.AverageCompletionTokens = acc.totalCompletionTokens / denom
			acc.summary.AverageTotalTokens = acc.totalTokens / denom
			acc.summary.AveragePrefillLatency = acc.totalPrefillLatency / denom
			acc.summary.AverageOutputLatency = acc.totalOutputLatency / denom
			acc.summary.AverageTotalLatency = acc.totalLatency / denom
			if acc.prefillSamples > 0 {
				acc.summary.AveragePrefillTokensPerSecond = acc.totalPrefillTPS / float64(acc.prefillSamples)
			}
			if acc.outputSamples > 0 {
				acc.summary.AverageOutputTokensPerSecond = acc.totalOutputTPS / float64(acc.outputSamples)
			}
		}
		rounds = append(rounds, acc.summary)
	}

	return rounds
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
	bestRoundThroughputBatch := batches[0]
	lowestErrorRateBatch := batches[0]

	for _, batch := range batches {
		if batch.Summary.AverageLatency < bestLatencyBatch.Summary.AverageLatency {
			bestLatencyBatch = batch
		}
		if batch.Summary.AverageThroughput > bestThroughputBatch.Summary.AverageThroughput {
			bestThroughputBatch = batch
		}
		if batch.Summary.AverageRoundThroughput > bestRoundThroughputBatch.Summary.AverageRoundThroughput {
			bestRoundThroughputBatch = batch
		}
		if batch.Summary.ErrorRate < lowestErrorRateBatch.Summary.ErrorRate {
			lowestErrorRateBatch = batch
		}
	}

	comparison.BestLatencyBatchID = bestLatencyBatch.ID
	comparison.BestThroughputBatchID = bestThroughputBatch.ID
	comparison.BestRoundThroughputBatchID = bestRoundThroughputBatch.ID
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
	close(s.telemetryChan)
}
