package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	Model            string    `json:"model"`
	Messages         []Message `json:"messages"`
	MaxTokens        int       `json:"max_tokens,omitempty"`
	Temperature      float32   `json:"temperature,omitempty"`
	TopP             float32   `json:"top_p,omitempty"`
	PresencePenalty  float32   `json:"presence_penalty,omitempty"`
	FrequencyPenalty float32   `json:"frequency_penalty,omitempty"`
	Stream           bool      `json:"stream,omitempty"`
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
	Index   int     `json:"index"`
	Message Message `json:"message"`
	FinishReason string `json:"finish_reason"`
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
func (c *OpenAIClient) GenerateCompletion(request OpenAIRequest, headers map[string]string) (*OpenAIResponse, time.Duration, error) {
	requestURL := fmt.Sprintf("%s/chat/completions", c.apiEndpoint)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, 0, fmt.Errorf("error marshaling request: %v", err)
	}

	req, err := http.NewRequest("POST", requestURL, bytes.NewBuffer(jsonData))
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
	defer resp.Body.Close()

	latency := time.Since(startTime)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, latency, fmt.Errorf("error reading response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, latency, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, latency, fmt.Errorf("error unmarshaling response: %v", err)
	}

	return &openAIResp, latency, nil
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

	_, _, err = c.GenerateCompletion(request, nil)
	return err
}