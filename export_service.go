package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// ExportService handles data export functionality
type ExportService struct {
	outputDir string
}

// NewExportService creates a new export service
func NewExportService(outputDir string) *ExportService {
	if outputDir == "" {
		outputDir = "exports"
	}

	// Create output directory if it doesn't exist
	os.MkdirAll(outputDir, 0755)

	return &ExportService{
		outputDir: outputDir,
	}
}

// Export exports test data in the specified format
func (s *ExportService) Export(batch TestBatch, request ExportRequest) (string, error) {
	switch request.Format {
	case ExportFormatCSV:
		return s.exportCSV(batch, request.Options)
	case ExportFormatJSON:
		return s.exportJSON(batch, request.Options)
	case ExportFormatPNG:
		return s.exportCharts(batch, request.Options)
	default:
		return "", fmt.Errorf("unsupported export format: %s", request.Format)
	}
}

// exportCSV exports test results as CSV
func (s *ExportService) exportCSV(batch TestBatch, options ExportOptions) (string, error) {
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("llm_speed_test_%s_%s.csv", batch.ID[:8], timestamp)
	filepath := filepath.Join(s.outputDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating CSV file: %v", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write header
	header := []string{
		"Test ID",
		"Timestamp",
		"Status",
		"Total Latency (ms)",
		"Time To First Token (ms)",
		"Output Time (ms)",
		"Prompt Tokens",
		"Completion Tokens",
		"Total Tokens",
		"Prefill Tokens Per Second",
		"Output Tokens Per Second",
		"Tokens Per Second",
		"Throughput",
		"Error",
	}

	if err := writer.Write(header); err != nil {
		return "", fmt.Errorf("error writing CSV header: %v", err)
	}

	// Write data rows
	for _, result := range batch.Results {
		row := []string{
			result.ID,
			result.Timestamp,
			map[bool]string{true: "Success", false: "Failed"}[result.Success],
			fmt.Sprintf("%.2f", result.TotalLatency),
			fmt.Sprintf("%.2f", result.RequestLatency),
			fmt.Sprintf("%.2f", result.OutputLatency),
			strconv.Itoa(result.PromptTokens),
			strconv.Itoa(result.CompletionTokens),
			strconv.Itoa(result.TotalTokens),
			fmt.Sprintf("%.2f", result.PrefillTokensPerSecond),
			fmt.Sprintf("%.2f", result.OutputTokensPerSecond),
			fmt.Sprintf("%.2f", result.TokensPerSecond),
			fmt.Sprintf("%.2f", result.Throughput),
			result.Error,
		}

		if err := writer.Write(row); err != nil {
			return "", fmt.Errorf("error writing CSV row: %v", err)
		}
	}

	// Write summary section
	writer.Write([]string{}) // Empty row
	writer.Write([]string{"SUMMARY"})
	writer.Write([]string{"Total Tests", strconv.Itoa(batch.Summary.TotalTests)})
	writer.Write([]string{"Successful Tests", strconv.Itoa(batch.Summary.SuccessfulTests)})
	writer.Write([]string{"Failed Tests", strconv.Itoa(batch.Summary.FailedTests)})
	writer.Write([]string{"Error Rate", fmt.Sprintf("%.2f%%", batch.Summary.ErrorRate*100)})
	writer.Write([]string{})
	writer.Write([]string{"LATENCY STATISTICS (ms)"})
	writer.Write([]string{"Average (Total)", fmt.Sprintf("%.2f", batch.Summary.AverageLatency)})
	writer.Write([]string{"Minimum (Total)", fmt.Sprintf("%.2f", batch.Summary.MinLatency)})
	writer.Write([]string{"Maximum (Total)", fmt.Sprintf("%.2f", batch.Summary.MaxLatency)})
	writer.Write([]string{"Average (Prefill)", fmt.Sprintf("%.2f", batch.Summary.AveragePrefillLatency)})
	writer.Write([]string{"Minimum (Prefill)", fmt.Sprintf("%.2f", batch.Summary.MinPrefillLatency)})
	writer.Write([]string{"Maximum (Prefill)", fmt.Sprintf("%.2f", batch.Summary.MaxPrefillLatency)})
	writer.Write([]string{"Average (Output)", fmt.Sprintf("%.2f", batch.Summary.AverageOutputLatency)})
	writer.Write([]string{"Minimum (Output)", fmt.Sprintf("%.2f", batch.Summary.MinOutputLatency)})
	writer.Write([]string{"Maximum (Output)", fmt.Sprintf("%.2f", batch.Summary.MaxOutputLatency)})
	writer.Write([]string{})
	writer.Write([]string{"THROUGHPUT STATISTICS (tokens/second)"})
	writer.Write([]string{"Average", fmt.Sprintf("%.2f", batch.Summary.AverageThroughput)})
	writer.Write([]string{"Minimum", fmt.Sprintf("%.2f", batch.Summary.MinThroughput)})
	writer.Write([]string{"Maximum", fmt.Sprintf("%.2f", batch.Summary.MaxThroughput)})
	writer.Write([]string{})
	writer.Write([]string{"PREFILL TOKENS/SEC"})
	writer.Write([]string{"Average", fmt.Sprintf("%.2f", batch.Summary.AveragePrefillTokensPerSecond)})
	writer.Write([]string{"Minimum", fmt.Sprintf("%.2f", batch.Summary.MinPrefillTokensPerSecond)})
	writer.Write([]string{"Maximum", fmt.Sprintf("%.2f", batch.Summary.MaxPrefillTokensPerSecond)})
	writer.Write([]string{})
	writer.Write([]string{"OUTPUT TOKENS/SEC"})
	writer.Write([]string{"Average", fmt.Sprintf("%.2f", batch.Summary.AverageOutputTokensPerSecond)})
	writer.Write([]string{"Minimum", fmt.Sprintf("%.2f", batch.Summary.MinOutputTokensPerSecond)})
	writer.Write([]string{"Maximum", fmt.Sprintf("%.2f", batch.Summary.MaxOutputTokensPerSecond)})

	return filepath, nil
}

// exportJSON exports test results as JSON
func (s *ExportService) exportJSON(batch TestBatch, options ExportOptions) (string, error) {
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("llm_speed_test_%s_%s.json", batch.ID[:8], timestamp)
	filepath := filepath.Join(s.outputDir, filename)

	// Create export data structure
	exportData := struct {
		ExportMetadata struct {
			ExportTime time.Time `json:"exportTime"`
			Format     string    `json:"format"`
		} `json:"exportMetadata"`
		Batch TestBatch `json:"batch"`
	}{
		ExportMetadata: struct {
			ExportTime time.Time `json:"exportTime"`
			Format     string    `json:"format"`
		}{
			ExportTime: time.Now(),
			Format:     "JSON",
		},
		Batch: batch,
	}

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating JSON file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(exportData); err != nil {
		return "", fmt.Errorf("error encoding JSON data: %v", err)
	}

	return filepath, nil
}

// exportCharts exports test results as chart images
func (s *ExportService) exportCharts(batch TestBatch, options ExportOptions) (string, error) {
	// This is a placeholder for chart export functionality
	// In a real implementation, you would use a charting library
	// to generate PNG images of the charts

	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("llm_speed_test_charts_%s_%s.txt", batch.ID[:8], timestamp)
	filepath := filepath.Join(s.outputDir, filename)

	// For now, create a text file with chart data
	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating chart file: %v", err)
	}
	defer file.Close()

	// Write chart data in a format that could be used by charting libraries
	fmt.Fprintf(file, "CHART DATA FOR LLM SPEED TEST\n")
	fmt.Fprintf(file, "Batch ID: %s\n", batch.ID)
	fmt.Fprintf(file, "Model: %s\n", batch.Configuration.Model)
	fmt.Fprintf(file, "Test Count: %d\n\n", batch.Configuration.TestCount)

	// Latency data
	fmt.Fprintf(file, "LATENCY DATA (ms):\n")
	fmt.Fprintf(file, "Test#,Latency\n")
	for i, result := range batch.Results {
		if result.Success {
			fmt.Fprintf(file, "%d,%.2f\n", i+1, result.TotalLatency)
		}
	}

	fmt.Fprintf(file, "\nTHROUGHPUT DATA (tokens/second):\n")
	fmt.Fprintf(file, "Test#,Throughput\n")
	for i, result := range batch.Results {
		if result.Success {
			fmt.Fprintf(file, "%d,%.2f\n", i+1, result.Throughput)
		}
	}

	fmt.Fprintf(file, "\nTOKENS PER SECOND DATA:\n")
	fmt.Fprintf(file, "Test#,TokensPerSecond\n")
	for i, result := range batch.Results {
		if result.Success {
			fmt.Fprintf(file, "%d,%.2f\n", i+1, result.TokensPerSecond)
		}
	}

	return filepath, nil
}

// ExportComparison exports comparison data
func (s *ExportService) ExportComparison(comparison ComparisonResult, format ExportFormat) (string, error) {
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("llm_comparison_%s.%s", timestamp, string(format))
	filepath := filepath.Join(s.outputDir, filename)

	switch format {
	case ExportFormatCSV:
		return s.exportComparisonCSV(comparison, filepath)
	case ExportFormatJSON:
		return s.exportComparisonJSON(comparison, filepath)
	default:
		return "", fmt.Errorf("unsupported format for comparison export: %s", format)
	}
}

// exportComparisonCSV exports comparison as CSV
func (s *ExportService) exportComparisonCSV(comparison ComparisonResult, filepath string) (string, error) {
	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating comparison CSV file: %v", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write comparison summary
	writer.Write([]string{"COMPARISON SUMMARY"})
	writer.Write([]string{"Best Latency Batch ID", comparison.Comparison.BestLatencyBatchID})
	writer.Write([]string{"Best Throughput Batch ID", comparison.Comparison.BestThroughputBatchID})
	writer.Write([]string{"Best Tokens/Sec Batch ID", comparison.Comparison.BestTokensPerSecBatchID})
	writer.Write([]string{"Lowest Error Rate Batch ID", comparison.Comparison.LowestErrorRateBatchID})
	writer.Write([]string{})

	// Write batch comparison data
	header := []string{
		"Batch ID",
		"Model",
		"Total Tests",
		"Successful Tests",
		"Error Rate (%)",
		"Avg Latency (ms)",
		"Min Latency (ms)",
		"Max Latency (ms)",
		"Avg Throughput",
		"Min Throughput",
		"Max Throughput",
		"Avg Tokens/Sec",
		"Min Tokens/Sec",
		"Max Tokens/Sec",
	}

	writer.Write(header)

	for _, batch := range comparison.Batches {
		row := []string{
			batch.ID[:8],
			batch.Configuration.Model,
			strconv.Itoa(batch.Summary.TotalTests),
			strconv.Itoa(batch.Summary.SuccessfulTests),
			fmt.Sprintf("%.2f", batch.Summary.ErrorRate*100),
			fmt.Sprintf("%.2f", batch.Summary.AverageLatency),
			fmt.Sprintf("%.2f", batch.Summary.MinLatency),
			fmt.Sprintf("%.2f", batch.Summary.MaxLatency),
			fmt.Sprintf("%.2f", batch.Summary.AverageThroughput),
			fmt.Sprintf("%.2f", batch.Summary.MinThroughput),
			fmt.Sprintf("%.2f", batch.Summary.MaxThroughput),
			fmt.Sprintf("%.2f", batch.Summary.AverageTokensPerSecond),
			fmt.Sprintf("%.2f", batch.Summary.MinTokensPerSecond),
			fmt.Sprintf("%.2f", batch.Summary.MaxTokensPerSecond),
		}

		writer.Write(row)
	}

	return filepath, nil
}

// exportComparisonJSON exports comparison as JSON
func (s *ExportService) exportComparisonJSON(comparison ComparisonResult, filepath string) (string, error) {
	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating comparison JSON file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(comparison); err != nil {
		return "", fmt.Errorf("error encoding comparison JSON data: %v", err)
	}

	return filepath, nil
}

// GetExportDirectory returns the export directory path
func (s *ExportService) GetExportDirectory() string {
	return s.outputDir
}
