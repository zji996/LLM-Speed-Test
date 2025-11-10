package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	endpoint := "http://192.168.8.12:8000/v1"
	apiKey := "nWubQHWkkf1gCQxQJe"

	fmt.Println("=== Testing API Connection ===\n")
	fmt.Printf("Endpoint: %s\n", endpoint)
	fmt.Printf("API Key: %s (length: %d)\n\n", apiKey, len(apiKey))

	// Test 1: GET /v1/models
	fmt.Println("Test 1: GET /v1/models")
	url := fmt.Sprintf("%s/models", endpoint)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("❌ Error creating request: %v\n", err)
		return
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("Request URL: %s\n", url)
	fmt.Printf("Authorization: Bearer %s\n\n", apiKey)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Error making request: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	fmt.Printf("Status: %s\n\n", resp.Status)

	// Print headers
	fmt.Println("Response Headers:")
	for key, values := range resp.Header {
		for _, value := range values {
			fmt.Printf("  %s: %s\n", key, value)
		}
	}
	fmt.Println()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ Error reading response: %v\n", err)
		return
	}

	fmt.Printf("Response Body:\n%s\n\n", string(body))

	// Parse JSON
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("❌ Error parsing JSON: %v\n", err)
	} else {
		fmt.Println("Parsed Response:")
		prettyJSON, _ := json.MarshalIndent(result, "", "  ")
		fmt.Printf("%s\n\n", prettyJSON)

		// Extract models
		if data, ok := result["data"].([]interface{}); ok {
			fmt.Printf("Found %d models:\n", len(data))
			for i, item := range data {
				if model, ok := item.(map[string]interface{}); ok {
					if id, ok := model["id"].(string); ok {
						fmt.Printf("  %d. %s", i+1, id)
						if ownedBy, ok := model["owned_by"].(string); ok {
							fmt.Printf(" (owned by: %s)", ownedBy)
						}
						fmt.Println()
					}
				}
			}
		} else {
			fmt.Println("No 'data' field found in response, or it's not an array")
		}
	}

	fmt.Println("\n=== Test Complete ===")
}
