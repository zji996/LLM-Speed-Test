# Tools Directory

This directory contains utility tools for debugging and testing the LLM Speed Test application.

## Test API Debug Tool

### Purpose
The `test_api_debug.go` tool is used to debug API connectivity issues and verify that models can be retrieved from the OpenAI-compatible API endpoint.

### Usage

1. Edit the `test_api_debug.go` file and update the endpoint and API key:
```go
endpoint := "http://192.168.8.12:8000/v1"
apiKey := "nWubQHWkkf1gCQxQJe"
```

2. Run the test tool:
```bash
cd tools
go run test_api_debug.go
```

### What it does

The tool performs the following tests:

1. **Connection Test**: Attempts to connect to the specified `/v1/models` endpoint
2. **Authentication Test**: Verifies the API key is accepted
3. **Response Analysis**: Displays the raw HTTP response
4. **JSON Parsing**: Parses and displays the response in a readable format
5. **Model Extraction**: Lists all available models from the response

### Expected Output

If successful, you'll see:
```
=== Testing API Connection ===

Endpoint: http://192.168.8.12:8000/v1
API Key: nWubQHWkkf1gCQxQJe (length: 21)

Test 1: GET /v1/models
Request URL: http://192.168.8.12:8000/v1/models
...
Status Code: 200
Response Body:
{"object":"list","data":[{"id":"model1","created":1234567890,"owned_by":"organization"},...]}

Found 3 models:
  1. model1 (owned by: organization)
  2. model2 (owned by: organization)
  3. model3 (owned by: organization)
```

### Troubleshooting

If the tool fails, check:

1. **Network connectivity**: Ensure the server is reachable
2. **API endpoint**: Verify the URL format is correct (e.g., `http://192.168.8.12:8000/v1`)
3. **API key**: Confirm the key is correct and has the right permissions
4. **Server logs**: Check the backend server logs for authentication errors
5. **CORS issues**: If testing from browser, ensure CORS is configured properly

### Tips for Common Issues

- **Empty model list**: The API might be returning an empty array. Check if models are properly loaded on the server.
- **Authentication errors**: Some servers require specific headers. You can modify the `req.Header.Set()` calls in the test file to add custom headers.
- **404 errors**: Double-check the endpoint URL. Some servers use `/models` without the `/v1` prefix.

## Modifying for Different Servers

To test different API servers, simply change the endpoint and API key variables in the `main()` function:

```go
endpoint := "https://api.openai.com/v1"
apiKey := "sk-xxxxxxxxxxxxxxxxxxxx"
```

## Adding Custom Headers

If your API requires custom headers (e.g., organization ID), add them to the request:

```go
req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
req.Header.Set("Content-Type", "application/json")
req.Header.Set("OpenAI-Organization", "org-yourorgid")  // Add custom header
```
