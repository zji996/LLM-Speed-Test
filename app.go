package main

import (
	"context"
	"fmt"
	"sync"
)

// App struct
type App struct {
	ctx              context.Context
	speedTestService *SpeedTestService
	exportService    *ExportService
	activeTests      map[string]*TestBatch
	mu               sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		speedTestService: NewSpeedTestService(),
		exportService:    NewExportService("exports"),
		activeTests:      make(map[string]*TestBatch),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ValidateAPIKey validates an API key for the given endpoint
func (a *App) ValidateAPIKey(endpoint, apiKey string) error {
	client := NewOpenAIClient(endpoint, apiKey, 30)
	return client.ValidateAPIKey()
}

// GetAvailableModels retrieves available models from the API
func (a *App) GetAvailableModels(endpoint, apiKey string) ([]string, error) {
	client := NewOpenAIClient(endpoint, apiKey, 30)
	return client.GetModels(nil)
}

// StartSpeedTest starts a new speed test with the given configuration
func (a *App) StartSpeedTest(config TestConfiguration) (*TestBatch, error) {
	// Store the batch ID for progress tracking
	a.mu.Lock()
	defer a.mu.Unlock()

	// Run the speed test in a goroutine
	go func() {
		batch, err := a.speedTestService.RunSpeedTest(config)
		if err != nil {
			fmt.Printf("Error running speed test: %v\n", err)
			return
		}

		a.mu.Lock()
		a.activeTests[batch.ID] = batch
		a.mu.Unlock()
	}()

	// Return a placeholder batch that will be updated
	return &TestBatch{
		ID:            "running",
		Configuration: config,
	}, nil
}

// GetTestProgress retrieves the current progress of active tests
func (a *App) GetTestProgress() ([]ProgressUpdate, error) {
	progress := make([]ProgressUpdate, 0)

	// Collect progress updates from the channel
	for {
		select {
		case update := <-a.speedTestService.GetProgressChannel():
			progress = append(progress, update)
		default:
			// No more updates available
			return progress, nil
		}
	}
}

// GetTestResults retrieves completed test results
func (a *App) GetTestResults() ([]TestResult, error) {
	results := make([]TestResult, 0)

	// Collect results from the channel
	for {
		select {
		case result := <-a.speedTestService.GetResultsChannel():
			results = append(results, result)
		default:
			// No more results available
			return results, nil
		}
	}
}

// GetTestBatch retrieves a completed test batch by ID
func (a *App) GetTestBatch(batchID string) (*TestBatch, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if batch, exists := a.activeTests[batchID]; exists {
		return batch, nil
	}

	return nil, fmt.Errorf("test batch not found: %s", batchID)
}

// GetAllTestBatches retrieves all completed test batches
func (a *App) GetAllTestBatches() ([]TestBatch, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	batches := make([]TestBatch, 0, len(a.activeTests))
	for _, batch := range a.activeTests {
		batches = append(batches, *batch)
	}

	return batches, nil
}

// CompareTestBatches compares multiple test batches
func (a *App) CompareTestBatches(batchIDs []string) (*ComparisonResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	batches := make([]TestBatch, 0, len(batchIDs))
	for _, batchID := range batchIDs {
		if batch, exists := a.activeTests[batchID]; exists {
			batches = append(batches, *batch)
		}
	}

	if len(batches) < 2 {
		return nil, fmt.Errorf("need at least 2 test batches to compare")
	}

	return a.speedTestService.CompareBatches(batches)
}

// ExportTestData exports test data in the specified format
func (a *App) ExportTestData(batchID string, format string, options ExportOptions) (string, error) {
	a.mu.RLock()
	batch, exists := a.activeTests[batchID]
	a.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("test batch not found: %s", batchID)
	}

	request := ExportRequest{
		BatchID: batchID,
		Format:  ExportFormat(format),
		Options: options,
	}

	return a.exportService.Export(*batch, request)
}

// GetExportDirectory returns the export directory path
func (a *App) GetExportDirectory() string {
	return a.exportService.GetExportDirectory()
}

// GetDefaultTestConfiguration returns a default test configuration
func (a *App) GetDefaultTestConfiguration() TestConfiguration {
	return TestConfiguration{
		APIEndpoint:      "https://api.openai.com/v1",
		APIKey:           "",
		Model:            "gpt-3.5-turbo",
		PromptType:       "fixed",
		PromptLength:     512,
		Prompt:           "",
		MaxTokens:        128,
		Temperature:      1.0,
		TopP:             0.1,
		PresencePenalty:  -1.0,
		FrequencyPenalty: -1.0,
		TestCount:        10,
		ConcurrentTests:  3,
		Timeout:          60,
		Headers:          make(map[string]string),
	}
}

// GetPromptTypes returns available prompt types
func (a *App) GetPromptTypes() []string {
	return GetPromptTypes()
}

// GetDefaultPromptLengths returns recommended prompt lengths
func (a *App) GetDefaultPromptLengths() []int {
	return GetDefaultPromptLengths()
}

// ValidatePromptConfig validates prompt configuration
func (a *App) ValidatePromptConfig(promptType string, promptLength int) error {
	return ValidatePromptConfig(promptType, promptLength)
}

// domReady is called after front-end resources have been loaded
func (a *App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// Shutdown performs cleanup when the app is shutting down
func (a *App) Shutdown() {
	if a.speedTestService != nil {
		a.speedTestService.Close()
	}
}

// shutdown is called during application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform cleanup
	a.Shutdown()
}
