package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"sort"
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

	// Write configuration header (align with UI header/metadata)
	writer.Write([]string{"CONFIGURATION"})
	writer.Write([]string{"Batch ID", batch.ID})
	writer.Write([]string{"Model", batch.Configuration.Model})
	writer.Write([]string{"Test Mode", batch.Configuration.TestMode})
	writer.Write([]string{"Prompt Length (tokens)", strconv.Itoa(batch.Configuration.PromptLength)})
	writer.Write([]string{"Max Output Tokens", strconv.Itoa(batch.Configuration.MaxTokens)})
	writer.Write([]string{"Concurrent Tests (base)", strconv.Itoa(batch.Configuration.ConcurrentTests)})
	writer.Write([]string{"Test Rounds (per step)", strconv.Itoa(batch.Configuration.TestCount)})

	if batch.Configuration.TestMode == "concurrency_step" || batch.Configuration.TestMode == "input_step" {
		writer.Write([]string{"Step Start", strconv.Itoa(batch.Configuration.StepConfig.Start)})
		writer.Write([]string{"Step End", strconv.Itoa(batch.Configuration.StepConfig.End)})
		writer.Write([]string{"Step Interval", strconv.Itoa(batch.Configuration.StepConfig.Step)})
	}

	if batch.StartTime != "" && batch.EndTime != "" {
		writer.Write([]string{"Start Time", batch.StartTime})
		writer.Write([]string{"End Time", batch.EndTime})

		start, errStart := time.Parse(time.RFC3339, batch.StartTime)
		end, errEnd := time.Parse(time.RFC3339, batch.EndTime)
		if errStart == nil && errEnd == nil && end.After(start) {
			duration := end.Sub(start)
			writer.Write([]string{"Total Duration (seconds)", fmt.Sprintf("%.3f", duration.Seconds())})
		}
	}

	writer.Write([]string{})

	// Write header
	header := []string{
		"Test ID",
		"Timestamp",
		"Round #",
		"Round Slot",
		"Status",
		"Total Latency (ms)",
		"Time To First Token (ms)",
		"Output Time (ms)",
		"Prompt Tokens",
		"Completion Tokens",
		"Total Tokens",
		"Prefill Tokens Per Second",
		"Output Tokens Per Second",
		"Throughput",
		"Actual Concurrency",
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
			strconv.Itoa(result.RoundNumber),
			strconv.Itoa(result.RoundPosition),
			map[bool]string{true: "Success", false: "Failed"}[result.Success],
			fmt.Sprintf("%.2f", result.TotalLatency),
			fmt.Sprintf("%.2f", result.RequestLatency),
			fmt.Sprintf("%.2f", result.OutputLatency),
			strconv.Itoa(result.PromptTokens),
			strconv.Itoa(result.CompletionTokens),
			strconv.Itoa(result.TotalTokens),
			fmt.Sprintf("%.2f", result.PrefillTokensPerSecond),
			fmt.Sprintf("%.2f", result.OutputTokensPerSecond),
			fmt.Sprintf("%.2f", result.Throughput),
			strconv.Itoa(result.ActualConcurrency),
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
	writer.Write([]string{"ROUND THROUGHPUT (aggregate decode tokens/second)"})
	writer.Write([]string{"Average", fmt.Sprintf("%.2f", batch.Summary.AverageRoundThroughput)})
	writer.Write([]string{"Minimum", fmt.Sprintf("%.2f", batch.Summary.MinRoundThroughput)})
	writer.Write([]string{"Maximum", fmt.Sprintf("%.2f", batch.Summary.MaxRoundThroughput)})
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

	if len(batch.RoundSummaries) > 0 {
		writer.Write([]string{})
		writer.Write([]string{"ROUND SUMMARIES"})
		writer.Write([]string{"Round #", "Requests", "Successes", "Success Rate", "Avg Output TPS", "Total Output TPS", "Avg TTFT (ms)", "Avg Decode (ms)", "Avg Total (ms)"})
		for _, round := range batch.RoundSummaries {
			writer.Write([]string{
				strconv.Itoa(round.RoundNumber),
				strconv.Itoa(round.TotalRequests),
				strconv.Itoa(round.SuccessfulRequests),
				fmt.Sprintf("%.2f%%", round.SuccessRate*100),
				fmt.Sprintf("%.2f", round.AverageOutputTokensPerSecond),
				fmt.Sprintf("%.2f", round.TotalOutputTokensPerSecond),
				fmt.Sprintf("%.2f", round.AveragePrefillLatency),
				fmt.Sprintf("%.2f", round.AverageOutputLatency),
				fmt.Sprintf("%.2f", round.AverageTotalLatency),
			})
		}
	}

	// Step performance breakdown for step tests, aligned with "Step Performance" table in UI
	if points, xLabel := computeStepPerformancePoints(batch); len(points) > 0 {
		writer.Write([]string{})
		writer.Write([]string{"STEP PERFORMANCE"})
		writer.Write([]string{
			xLabel,
			"Avg TTFT (ms)",
			"Avg Single Output TPS",
			"Avg Total Output TPS",
			"Avg Single Prefill TPS",
			"Avg Total Prefill TPS",
		})

		for _, p := range points {
			writer.Write([]string{
				strconv.Itoa(p.XValue),
				fmt.Sprintf("%.2f", p.AvgTTFT),
				fmt.Sprintf("%.2f", p.AvgSingleOutput),
				fmt.Sprintf("%.2f", p.AvgTotalOutput),
				fmt.Sprintf("%.2f", p.AvgSinglePrefill),
				fmt.Sprintf("%.2f", p.AvgTotalPrefill),
			})
		}
	}

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
			ExportTime    time.Time     `json:"exportTime"`
			Format        string        `json:"format"`
			BatchID       string        `json:"batchId"`
			Model         string        `json:"model"`
			TestMode      string        `json:"testMode"`
			IncludeCharts bool          `json:"includeCharts"`
			ChartTypes    []string      `json:"chartTypes,omitempty"`
			Options       ExportOptions `json:"options,omitempty"`
		} `json:"exportMetadata"`
		Batch           TestBatch `json:"batch"`
		StepPerformance *struct {
			Mode   string `json:"mode"`
			XLabel string `json:"xLabel"`
			Points []struct {
				XValue           int     `json:"xValue"`
				AvgSingleOutput  float64 `json:"avgSingleOutput"`
				AvgTotalOutput   float64 `json:"avgTotalOutput"`
				AvgSinglePrefill float64 `json:"avgSinglePrefill"`
				AvgTotalPrefill  float64 `json:"avgTotalPrefill"`
				AvgTTFT          float64 `json:"avgTTFT"`
			} `json:"points"`
		} `json:"stepPerformance,omitempty"`
	}{
		ExportMetadata: struct {
			ExportTime    time.Time     `json:"exportTime"`
			Format        string        `json:"format"`
			BatchID       string        `json:"batchId"`
			Model         string        `json:"model"`
			TestMode      string        `json:"testMode"`
			IncludeCharts bool          `json:"includeCharts"`
			ChartTypes    []string      `json:"chartTypes,omitempty"`
			Options       ExportOptions `json:"options,omitempty"`
		}{
			ExportTime:    time.Now(),
			Format:        "JSON",
			BatchID:       batch.ID,
			Model:         batch.Configuration.Model,
			TestMode:      batch.Configuration.TestMode,
			IncludeCharts: options.IncludeCharts,
			ChartTypes:    normalizeChartTypes(options.ChartTypes),
			Options:       options,
		},
		Batch: batch,
	}

	// Attach step performance information if this is a step test
	if batch.Configuration.TestMode == "concurrency_step" || batch.Configuration.TestMode == "input_step" {
		points, xLabel := computeStepPerformancePoints(batch)
		if len(points) > 0 {
			step := struct {
				Mode   string `json:"mode"`
				XLabel string `json:"xLabel"`
				Points []struct {
					XValue           int     `json:"xValue"`
					AvgSingleOutput  float64 `json:"avgSingleOutput"`
					AvgTotalOutput   float64 `json:"avgTotalOutput"`
					AvgSinglePrefill float64 `json:"avgSinglePrefill"`
					AvgTotalPrefill  float64 `json:"avgTotalPrefill"`
					AvgTTFT          float64 `json:"avgTTFT"`
				} `json:"points"`
			}{
				Mode:   batch.Configuration.TestMode,
				XLabel: xLabel,
				Points: make([]struct {
					XValue           int     `json:"xValue"`
					AvgSingleOutput  float64 `json:"avgSingleOutput"`
					AvgTotalOutput   float64 `json:"avgTotalOutput"`
					AvgSinglePrefill float64 `json:"avgSinglePrefill"`
					AvgTotalPrefill  float64 `json:"avgTotalPrefill"`
					AvgTTFT          float64 `json:"avgTTFT"`
				}, len(points)),
			}

			for i, p := range points {
				step.Points[i].XValue = p.XValue
				step.Points[i].AvgSingleOutput = p.AvgSingleOutput
				step.Points[i].AvgTotalOutput = p.AvgTotalOutput
				step.Points[i].AvgSinglePrefill = p.AvgSinglePrefill
				step.Points[i].AvgTotalPrefill = p.AvgTotalPrefill
				step.Points[i].AvgTTFT = p.AvgTTFT
			}

			exportData.StepPerformance = &step
		}
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
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("llm_speed_test_charts_%s_%s.png", batch.ID[:8], timestamp)
	filepath := filepath.Join(s.outputDir, filename)

	chartTypes := normalizeChartTypes(options.ChartTypes)
	if len(chartTypes) == 0 {
		chartTypes = []string{"latency", "throughput", "roundThroughput"}
	}

	const (
		width          = 1200
		heightPerChart = 240
		marginTop      = 20
		marginBottom   = 20
		leftPadding    = 60
		rightPadding   = 30
		topPadding     = 20
		bottomPadding  = 30
	)

	totalHeight := marginTop + marginBottom + len(chartTypes)*heightPerChart
	if totalHeight < 1 {
		return "", fmt.Errorf("no chart types requested for export")
	}

	img := image.NewRGBA(image.Rect(0, 0, width, totalHeight))
	background := color.RGBA{R: 15, G: 23, B: 42, A: 255} // slate-900
	draw.Draw(img, img.Bounds(), &image.Uniform{background}, image.Point{}, draw.Src)

	for index, metric := range chartTypes {
		top := marginTop + index*heightPerChart
		bottom := top + heightPerChart - 10
		if bottom > totalHeight-marginBottom {
			bottom = totalHeight - marginBottom
		}

		plotRect := image.Rect(
			leftPadding,
			top+topPadding,
			width-rightPadding,
			bottom-bottomPadding,
		)

		drawChartBackground(img, plotRect)

		values := extractMetricSeries(batch, metric)
		if len(values) == 0 {
			continue
		}

		lineColor := chartColor(metric)
		drawLineChart(img, plotRect, values, lineColor)
	}

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("error creating chart PNG file: %v", err)
	}
	defer file.Close()

	if err := png.Encode(file, img); err != nil {
		return "", fmt.Errorf("error encoding chart PNG: %v", err)
	}

	return filepath, nil
}

// stepPerformancePoint mirrors the frontend step performance data structure.
type stepPerformancePoint struct {
	XValue           int
	AvgSingleOutput  float64
	AvgTotalOutput   float64
	AvgSinglePrefill float64
	AvgTotalPrefill  float64
	AvgTTFT          float64
}

// computeStepPerformancePoints aggregates step test performance by concurrency or input length.
func computeStepPerformancePoints(batch TestBatch) ([]stepPerformancePoint, string) {
	mode := batch.Configuration.TestMode
	isConcurrencyStep := mode == "concurrency_step"
	isInputStep := mode == "input_step"

	if !isConcurrencyStep && !isInputStep {
		return nil, ""
	}

	resultsByKey := make(map[int][]TestResult)
	for _, result := range batch.Results {
		if !result.Success {
			continue
		}

		var key int
		if isConcurrencyStep {
			if result.ActualConcurrency > 0 {
				key = result.ActualConcurrency
			} else {
				key = result.Configuration.ConcurrentTests
			}
		} else if isInputStep {
			key = result.PromptTokens
		}

		if key <= 0 {
			continue
		}

		resultsByKey[key] = append(resultsByKey[key], result)
	}

	if len(resultsByKey) == 0 {
		return nil, ""
	}

	keys := make([]int, 0, len(resultsByKey))
	for k := range resultsByKey {
		keys = append(keys, k)
	}
	sort.Ints(keys)

	points := make([]stepPerformancePoint, 0, len(keys))
	for _, key := range keys {
		results := resultsByKey[key]
		if len(results) == 0 {
			continue
		}

		var sumSingleOutput float64
		var sumSinglePrefill float64
		var sumTTFT float64
		var concurrency int

		for _, r := range results {
			sumSingleOutput += r.OutputTokensPerSecond
			sumSinglePrefill += r.PrefillTokensPerSecond
			sumTTFT += r.RequestLatency

			if concurrency == 0 {
				concurrency = r.ActualConcurrency
				if concurrency <= 0 {
					concurrency = r.Configuration.ConcurrentTests
				}
				if concurrency <= 0 {
					concurrency = 1
				}
			}
		}

		count := float64(len(results))
		avgSingleOutput := sumSingleOutput / count
		avgSinglePrefill := sumSinglePrefill / count
		avgTTFT := sumTTFT / count

		avgTotalOutput := avgSingleOutput * float64(concurrency)
		avgTotalPrefill := avgSinglePrefill * float64(concurrency)

		points = append(points, stepPerformancePoint{
			XValue:           key,
			AvgSingleOutput:  avgSingleOutput,
			AvgTotalOutput:   avgTotalOutput,
			AvgSinglePrefill: avgSinglePrefill,
			AvgTotalPrefill:  avgTotalPrefill,
			AvgTTFT:          avgTTFT,
		})
	}

	xLabel := "并发数 (Concurrency)"
	if isInputStep {
		xLabel = "输入长度 (Tokens)"
	}

	return points, xLabel
}

// normalizeChartTypes ensures requested chart types are valid and de-duplicated.
func normalizeChartTypes(chartTypes []string) []string {
	if len(chartTypes) == 0 {
		return nil
	}

	allowed := map[string]struct{}{
		"latency":         {},
		"throughput":      {},
		"roundThroughput": {},
	}

	seen := make(map[string]struct{})
	var result []string
	for _, ct := range chartTypes {
		if _, ok := allowed[ct]; !ok {
			continue
		}
		if _, exists := seen[ct]; exists {
			continue
		}
		seen[ct] = struct{}{}
		result = append(result, ct)
	}

	return result
}

// extractMetricSeries returns the data series for a given chart metric name.
// It mirrors the metrics used by the frontend charts.
func extractMetricSeries(batch TestBatch, metric string) []float64 {
	var series []float64
	switch metric {
	case "latency":
		for _, result := range batch.Results {
			if result.Success && !math.IsNaN(result.TotalLatency) && result.TotalLatency >= 0 {
				series = append(series, result.TotalLatency)
			}
		}
	case "throughput":
		for _, result := range batch.Results {
			if result.Success && !math.IsNaN(result.Throughput) && result.Throughput > 0 {
				series = append(series, result.Throughput)
			}
		}
	case "roundThroughput":
		for _, round := range batch.RoundSummaries {
			if round.TotalRequests > 0 && !math.IsNaN(round.TotalOutputTokensPerSecond) && round.TotalOutputTokensPerSecond > 0 {
				series = append(series, round.TotalOutputTokensPerSecond)
			}
		}
	}
	return series
}

// chartColor maps metric identifiers to line colors roughly matching the UI theme.
func chartColor(metric string) color.RGBA {
	switch metric {
	case "latency":
		// Orange
		return color.RGBA{R: 245, G: 158, B: 11, A: 255}
	case "throughput":
		// Cyan
		return color.RGBA{R: 6, G: 182, B: 212, A: 255}
	case "roundThroughput":
		// Purple
		return color.RGBA{R: 139, G: 92, B: 246, A: 255}
	default:
		return color.RGBA{R: 248, G: 250, B: 252, A: 255}
	}
}

// drawChartBackground renders a subtle panel and grid for one chart.
func drawChartBackground(img *image.RGBA, rect image.Rectangle) {
	panel := color.RGBA{R: 15, G: 23, B: 42, A: 255}
	border := color.RGBA{R: 55, G: 65, B: 81, A: 255}
	grid := color.RGBA{R: 31, G: 41, B: 55, A: 255}

	// panel
	draw.Draw(img, rect, &image.Uniform{panel}, image.Point{}, draw.Src)

	// border
	for x := rect.Min.X; x < rect.Max.X; x++ {
		img.Set(x, rect.Min.Y, border)
		img.Set(x, rect.Max.Y-1, border)
	}
	for y := rect.Min.Y; y < rect.Max.Y; y++ {
		img.Set(rect.Min.X, y, border)
		img.Set(rect.Max.X-1, y, border)
	}

	// horizontal grid lines
	rows := 4
	for i := 1; i < rows; i++ {
		y := rect.Min.Y + i*(rect.Dy())/rows
		for x := rect.Min.X; x < rect.Max.X; x++ {
			if x%4 < 2 {
				img.Set(x, y, grid)
			}
		}
	}
}

// drawLineChart draws a basic line chart for the given values into the provided rectangle.
func drawLineChart(img *image.RGBA, rect image.Rectangle, values []float64, col color.RGBA) {
	if len(values) == 0 {
		return
	}

	minVal := values[0]
	maxVal := values[0]
	for _, v := range values {
		if v < minVal {
			minVal = v
		}
		if v > maxVal {
			maxVal = v
		}
	}

	if math.IsNaN(minVal) || math.IsNaN(maxVal) {
		return
	}

	if maxVal == minVal {
		// Add small padding to avoid flat-line zero division.
		if maxVal == 0 {
			maxVal = 1
		} else {
			minVal = maxVal * 0.95
			maxVal = maxVal * 1.05
		}
	}

	rangeVal := maxVal - minVal
	if rangeVal <= 0 {
		rangeVal = 1
	}

	width := rect.Dx()
	height := rect.Dy()
	if width <= 1 || height <= 1 {
		return
	}

	points := make([]image.Point, len(values))
	for i, v := range values {
		var xNorm float64
		if len(values) == 1 {
			xNorm = 0.5
		} else {
			xNorm = float64(i) / float64(len(values)-1)
		}

		yNorm := (v - minVal) / rangeVal
		x := rect.Min.X + int(xNorm*float64(width-1))
		y := rect.Max.Y - 1 - int(yNorm*float64(height-1))

		points[i] = image.Point{X: x, Y: y}
	}

	// Draw line segments
	for i := 0; i < len(points)-1; i++ {
		drawLine(img, points[i], points[i+1], col)
	}

	// Draw small squares as points
	for _, p := range points {
		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				x := p.X + dx
				y := p.Y + dy
				if x >= rect.Min.X && x < rect.Max.X && y >= rect.Min.Y && y < rect.Max.Y {
					img.Set(x, y, col)
				}
			}
		}
	}
}

// drawLine draws a simple Bresenham line between two points.
func drawLine(img *image.RGBA, p0, p1 image.Point, col color.RGBA) {
	x0, y0 := p0.X, p0.Y
	x1, y1 := p1.X, p1.Y

	dx := int(math.Abs(float64(x1 - x0)))
	sx := 1
	if x0 > x1 {
		sx = -1
	}
	dy := -int(math.Abs(float64(y1 - y0)))
	sy := 1
	if y0 > y1 {
		sy = -1
	}
	err := dx + dy

	for {
		img.Set(x0, y0, col)
		if x0 == x1 && y0 == y1 {
			break
		}
		e2 := 2 * err
		if e2 >= dy {
			err += dy
			x0 += sx
		}
		if e2 <= dx {
			err += dx
			y0 += sy
		}
	}
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
	writer.Write([]string{"Best Round Throughput Batch ID", comparison.Comparison.BestRoundThroughputBatchID})
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
		"Avg Round Throughput",
		"Min Round Throughput",
		"Max Round Throughput",
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
			fmt.Sprintf("%.2f", batch.Summary.AverageRoundThroughput),
			fmt.Sprintf("%.2f", batch.Summary.MinRoundThroughput),
			fmt.Sprintf("%.2f", batch.Summary.MaxRoundThroughput),
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
