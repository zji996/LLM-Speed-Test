// @ts-check
// Wails bindings for main.App

/**
 * Validate an API key for the given endpoint
 * @param {string} endpoint - API endpoint
 * @param {string} apiKey - API key
 * @returns {Promise<void>}
 */
export function ValidateAPIKey(endpoint, apiKey) {
  return window.go.main.App.ValidateAPIKey(endpoint, apiKey);
}

/**
 * Get available models from the API
 * @param {string} endpoint - API endpoint
 * @param {string} apiKey - API key
 * @returns {Promise<Array<string>>} - Array of model IDs
 */
export function GetAvailableModels(endpoint, apiKey) {
  return window.go.main.App.GetAvailableModels(endpoint, apiKey);
}

/**
 * Start a speed test
 * @param {TestConfiguration} config - Test configuration
 * @returns {Promise<TestBatch>} - Test batch result
 */
export function StartSpeedTest(config) {
  return window.go.main.App.StartSpeedTest(config);
}

/**
 * Stop a running speed test
 * @param {string} batchId - Batch ID
 * @returns {Promise<void>}
 */
export function StopSpeedTest(batchId) {
  return window.go.main.App.StopSpeedTest(batchId);
}

/**
 * Get test progress
 * @returns {Promise<Array<ProgressUpdate>>} - Array of progress updates
 */
export function GetTestProgress() {
  return window.go.main.App.GetTestProgress();
}

/**
 * Get test results
 * @returns {Promise<Array<TestResult>>} - Array of test results
 */
export function GetTestResults() {
  return window.go.main.App.GetTestResults();
}

/**
 * Get real-time telemetry updates
 * @returns {Promise<Array<TelemetryUpdate>>} - Array of telemetry updates
 */
export function GetTelemetryUpdates() {
  return window.go.main.App.GetTelemetryUpdates();
}

/**
 * Get a test batch by ID
 * @param {string} batchId - Batch ID
 * @returns {Promise<TestBatch>} - Test batch
 */
export function GetTestBatch(batchId) {
  return window.go.main.App.GetTestBatch(batchId);
}

/**
 * Get all test batches
 * @returns {Promise<Array<TestBatch>>} - Array of test batches
 */
export function GetAllTestBatches() {
  return window.go.main.App.GetAllTestBatches();
}

/**
 * Compare test batches
 * @param {Array<string>} batchIds - Array of batch IDs
 * @returns {Promise<ComparisonResult>} - Comparison result
 */
export function CompareTestBatches(batchIds) {
  return window.go.main.App.CompareTestBatches(batchIds);
}

/**
 * Export test data
 * @param {string} batchId - Batch ID
 * @param {string} format - Export format
 * @param {ExportOptions} options - Export options
 * @returns {Promise<string>} - Export file path
 */
export function ExportTestData(batchId, format, options) {
  return window.go.main.App.ExportTestData(batchId, format, options);
}

/**
 * Get export directory
 * @returns {Promise<string>} - Export directory path
 */
export function GetExportDirectory() {
  return window.go.main.App.GetExportDirectory();
}

/**
 * Get default test configuration
 * @returns {Promise<TestConfiguration>} - Default configuration
 */
export function GetDefaultTestConfiguration() {
  return window.go.main.App.GetDefaultTestConfiguration();
}

/**
 * Get prompt types
 * @returns {Promise<Array<string>>} - Array of prompt types
 */
export function GetPromptTypes() {
  return window.go.main.App.GetPromptTypes();
}

/**
 * Get default prompt lengths
 * @returns {Promise<Array<number>>} - Array of prompt lengths
 */
export function GetDefaultPromptLengths() {
  return window.go.main.App.GetDefaultPromptLengths();
}

/**
 * Validate prompt configuration
 * @param {string} promptType - Prompt type
 * @param {number} promptLength - Prompt length
 * @returns {Promise<void>}
 */
export function ValidatePromptConfig(promptType, promptLength) {
  return window.go.main.App.ValidatePromptConfig(promptType, promptLength);
}
