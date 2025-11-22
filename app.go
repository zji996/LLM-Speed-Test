package main

import (
	"context"
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	maxStoredBatches = 50
	appVersion       = "v0.3"
)

// App struct
type App struct {
	ctx               context.Context
	speedTestService  *SpeedTestService
	exportService     *ExportService
	activeTests       map[string]*TestBatch
	cancelFuncs       map[string]context.CancelFunc
	completedBatchIDs []string
	mu                sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		speedTestService: NewSpeedTestService(),
		exportService:    NewExportService("exports"),
		activeTests:      make(map[string]*TestBatch),
		cancelFuncs:      make(map[string]context.CancelFunc),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetAppVersion returns the current application version.
func (a *App) GetAppVersion() string {
	return appVersion
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

	batchID := uuid.New().String()

	// Create a context with cancel for this test batch
	ctx, cancel := context.WithCancel(context.Background())
	a.cancelFuncs[batchID] = cancel

	// Run the speed test in a goroutine
	go func() {
		defer func() {
			a.mu.Lock()
			delete(a.cancelFuncs, batchID)
			a.mu.Unlock()
		}()

		batch, err := a.speedTestService.RunSpeedTest(ctx, config, batchID)
		if err != nil {
			fmt.Printf("Error running speed test: %v\n", err)
			return
		}

		a.mu.Lock()
		a.addCompletedBatchLocked(batch)
		a.mu.Unlock()
	}()

	// Return a placeholder batch that will be updated
	return &TestBatch{
		ID:            batchID,
		Configuration: config,
		Results:       []TestResult{},
	}, nil
}

// StopSpeedTest stops a running speed test
func (a *App) StopSpeedTest(batchID string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if cancel, exists := a.cancelFuncs[batchID]; exists {
		cancel()
		delete(a.cancelFuncs, batchID)
		return nil
	}

	// If no specific batch ID is provided or found, try to stop the most recent one?
	// The UI currently might not track the ID perfectly for stopping.
	// Let's handle the case where batchID might be empty (stop all).
	if batchID == "" && len(a.cancelFuncs) > 0 {
		for id, cancel := range a.cancelFuncs {
			cancel()
			delete(a.cancelFuncs, id)
		}
		return nil
	}

	return fmt.Errorf("test batch not found or not running: %s", batchID)
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

// GetTelemetryUpdates retrieves the latest telemetry updates
func (a *App) GetTelemetryUpdates() ([]TelemetryUpdate, error) {
	updates := make([]TelemetryUpdate, 0)

	// Collect updates from the channel
	for {
		select {
		case update := <-a.speedTestService.GetTelemetryChannel():
			updates = append(updates, update)
		default:
			// No more updates available
			return updates, nil
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

	// Preserve insertion order of completed batches so the
	// frontend sees a stable, recent history instead of a
	// map's random iteration order.
	batches := make([]TestBatch, 0, len(a.completedBatchIDs))
	for _, id := range a.completedBatchIDs {
		if batch, exists := a.activeTests[id]; exists {
			batches = append(batches, *batch)
		}
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

// ChooseExportDirectory shows a system directory picker and updates the export directory.
// Returns the newly selected directory path. If the user cancels, an empty string is returned.
func (a *App) ChooseExportDirectory() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application context not initialised")
	}

	currentDir := a.exportService.GetExportDirectory()
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "选择导出目录",
		DefaultDirectory: currentDir,
	})
	if err != nil {
		return "", err
	}

	// User cancelled the dialog
	if selected == "" {
		return "", nil
	}

	a.exportService = NewExportService(selected)
	return selected, nil
}

// SetExportDirectory updates the export directory used by the export service.
// The directory will be created if it does not exist.
func (a *App) SetExportDirectory(path string) error {
	if path == "" {
		return fmt.Errorf("export directory path cannot be empty")
	}

	// Normalise and ensure directory exists by reinitialising the service.
	a.exportService = NewExportService(path)
	return nil
}

// OpenExportDirectory opens the current export directory in the system file explorer.
func (a *App) OpenExportDirectory() error {
	exportDir := a.exportService.GetExportDirectory()
	if exportDir == "" {
		return fmt.Errorf("export directory is not configured")
	}

	if a.ctx == nil {
		return fmt.Errorf("application context not initialised")
	}

	// Use the Wails runtime helper so that the correct file manager is used
	// on each platform. The `file://` prefix is understood by the runtime.
	runtime.BrowserOpenURL(a.ctx, "file://"+exportDir)
	return nil
}

// GetDefaultTestConfiguration returns a default test configuration
func (a *App) GetDefaultTestConfiguration() TestConfiguration {
	return TestConfiguration{
		APIEndpoint:      "https://api.openai.com/v1",
		APIKey:           "",
		Model:            "",
		PromptType:       "fixed",
		PromptLength:     512,
		Prompt:           "",
		MaxTokens:        128,
		Temperature:      1.0,
		TopP:             0.1,
		PresencePenalty:  -1.0,
		FrequencyPenalty: -1.0,
		TestCount:        2,
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

// addCompletedBatchLocked adds a completed batch to the in-memory store
// and enforces an upper bound on how many batches we retain to avoid
// unbounded memory growth over a long-running session.
// Caller must hold a.mu.Lock().
func (a *App) addCompletedBatchLocked(batch *TestBatch) {
	if batch == nil || batch.ID == "" {
		return
	}

	// Only append to the ordered list if this is a new batch ID.
	if _, exists := a.activeTests[batch.ID]; !exists {
		a.completedBatchIDs = append(a.completedBatchIDs, batch.ID)
	}

	a.activeTests[batch.ID] = batch

	if len(a.completedBatchIDs) <= maxStoredBatches {
		return
	}

	// Drop oldest batches beyond the retention window.
	overflow := len(a.completedBatchIDs) - maxStoredBatches
	toRemove := a.completedBatchIDs[:overflow]
	a.completedBatchIDs = a.completedBatchIDs[overflow:]

	for _, id := range toRemove {
		// Do not delete the just-added batch if IDs somehow overlap.
		if id == batch.ID {
			continue
		}
		delete(a.activeTests, id)
	}
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
	// Cancel any running tests so goroutines and HTTP requests can exit.
	a.mu.Lock()
	for id, cancel := range a.cancelFuncs {
		cancel()
		delete(a.cancelFuncs, id)
	}
	a.mu.Unlock()

	if a.speedTestService != nil {
		a.speedTestService.Close()
	}
}

// shutdown is called during application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform cleanup
	a.Shutdown()
}
