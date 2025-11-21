package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OpenAIClient represents a client for OpenAI-compatible APIs
type OpenAIClient struct {
	apiEndpoint string
	apiKey      string
	httpClient  *http.Client
}

// OpenAIRequest represents a request to the OpenAI API
type OpenAIRequest struct {
	Model            string         `json:"model"`
	Messages         []Message      `json:"messages"`
	MaxTokens        int            `json:"max_tokens,omitempty"`
	Temperature      float32        `json:"temperature,omitempty"`
	TopP             float32        `json:"top_p,omitempty"`
	PresencePenalty  float32        `json:"presence_penalty,omitempty"`
	FrequencyPenalty float32        `json:"frequency_penalty,omitempty"`
	Stream           bool           `json:"stream,omitempty"`
	StreamOptions    *StreamOptions `json:"stream_options,omitempty"`
}

type StreamOptions struct {
	IncludeUsage bool `json:"include_usage,omitempty"`
}

// Message represents a message in the conversation
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIResponse represents a response from the OpenAI API
type OpenAIResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Choice represents a choice in the response
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage represents token usage information
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// NewOpenAIClient creates a new OpenAI client
func NewOpenAIClient(apiEndpoint, apiKey string, timeout int) *OpenAIClient {
	if apiEndpoint == "" {
		apiEndpoint = "https://api.openai.com/v1"
	}

	return &OpenAIClient{
		apiEndpoint: apiEndpoint,
		apiKey:      apiKey,
		httpClient: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

// GenerateCompletion generates a completion using the OpenAI API
// onToken is called when a new token is received (stream mode only)
// onFirstToken is called when the first token is received with the TTFT duration (stream mode only)
func (c *OpenAIClient) GenerateCompletion(ctx context.Context, request OpenAIRequest, headers map[string]string, onToken func(string), onFirstToken func(time.Duration)) (*OpenAIResponse, time.Duration, error) {
	requestURL := fmt.Sprintf("%s/chat/completions", c.apiEndpoint)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, 0, fmt.Errorf("error marshaling request: %v", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", requestURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, 0, fmt.Errorf("error creating request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	// Add custom headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	startTime := time.Now()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("error making request: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	if request.Stream && strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream") {
		return c.handleStreamingResponse(resp, startTime, onToken, onFirstToken)
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("error reading response: %v", err)
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, 0, fmt.Errorf("error unmarshaling response: %v", err)
	}

	return &openAIResp, time.Since(startTime), nil
}

type streamChoiceDelta struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type streamChoice struct {
	Index        int               `json:"index"`
	Delta        streamChoiceDelta `json:"delta"`
	FinishReason string            `json:"finish_reason"`
}

type streamResponse struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []streamChoice `json:"choices"`
	Usage   *Usage         `json:"usage,omitempty"`
}

func (c *OpenAIClient) handleStreamingResponse(resp *http.Response, startTime time.Time, onToken func(string), onFirstToken func(time.Duration)) (*OpenAIResponse, time.Duration, error) {
	reader := bufio.NewReader(resp.Body)
	defer resp.Body.Close()

	var builder strings.Builder
	var ttft time.Duration
	var finishReason string
	var usage Usage
	var usageAvailable bool
	var responseID string
	var model string
	var created int64

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, 0, fmt.Errorf("error reading stream response: %v", err)
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if !strings.HasPrefix(line, "data:") {
			continue
		}

		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "[DONE]" {
			break
		}

		var chunk streamResponse
		if err := json.Unmarshal([]byte(payload), &chunk); err != nil {
			return nil, 0, fmt.Errorf("error unmarshaling stream chunk: %v", err)
		}

		if responseID == "" && chunk.ID != "" {
			responseID = chunk.ID
		}
		if model == "" && chunk.Model != "" {
			model = chunk.Model
		}
		if created == 0 && chunk.Created != 0 {
			created = chunk.Created
		}

		if len(chunk.Choices) > 0 {
			delta := chunk.Choices[0].Delta
			if delta.Content != "" {
				builder.WriteString(delta.Content)
				
				// Call onToken callback
				if onToken != nil {
					onToken(delta.Content)
				}
			}
			
			// Calculate TTFT on first content received
			if ttft == 0 && delta.Content != "" {
				ttft = time.Since(startTime)
				if onFirstToken != nil {
					onFirstToken(ttft)
				}
			}
			
			if chunk.Choices[0].FinishReason != "" {
				finishReason = chunk.Choices[0].FinishReason
			}
		}

		if chunk.Usage != nil {
			usage = *chunk.Usage
			usageAvailable = true
		}
	}

	if ttft == 0 {
		ttft = time.Since(startTime)
	}

	choice := Choice{
		Index: 0,
		Message: Message{
			Role:    "assistant",
			Content: builder.String(),
		},
		FinishReason: finishReason,
	}

	response := &OpenAIResponse{
		ID:      responseID,
		Object:  "chat.completion",
		Created: created,
		Model:   model,
		Choices: []Choice{choice},
	}

	if usageAvailable {
		response.Usage = usage
	}

	return response, ttft, nil
}

// GetModels retrieves available models from the API
func (c *OpenAIClient) GetModels(headers map[string]string) ([]string, error) {
	requestURL := fmt.Sprintf("%s/models", c.apiEndpoint)

	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

	// Add custom headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Try to parse the response in different formats
	var modelsResp struct {
		Object string `json:"object"`
		Data   []struct {
			ID      string `json:"id"`
			Object  string `json:"object"`
			Created int64  `json:"created"`
			OwnedBy string `json:"owned_by"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &modelsResp); err != nil {
		return nil, fmt.Errorf("error unmarshaling response: %v", err)
	}

	// Check if we got a valid response
	if modelsResp.Object != "list" {
		return nil, fmt.Errorf("unexpected response format: expected object='list', got '%s'", modelsResp.Object)
	}

	if len(modelsResp.Data) == 0 {
		return nil, fmt.Errorf("no models found in response")
	}

	var models []string
	for _, model := range modelsResp.Data {
		if model.ID != "" {
			models = append(models, model.ID)
		}
	}

	if len(models) == 0 {
		return nil, fmt.Errorf("no valid model IDs found in response")
	}

	return models, nil
}

// ValidateAPIKey validates the API key by making a simple request
func (c *OpenAIClient) ValidateAPIKey() error {
	// First try to get available models to validate the API key
	models, err := c.GetModels(nil)
	if err != nil {
		return fmt.Errorf("failed to get models: %v", err)
	}

	if len(models) == 0 {
		return fmt.Errorf("no models available")
	}

	// Use the first available model for validation
	request := OpenAIRequest{
		Model: models[0],
		Messages: []Message{
			{Role: "user", Content: "Hello"},
		},
		MaxTokens: 1,
	}

	_, _, err = c.GenerateCompletion(context.Background(), request, nil, nil, nil)
	return err
}
