# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `wails dev` - Run application in development mode (integrates frontend and backend with hot reload)
- `wails build` - Build complete desktop application for production

### Frontend Only (for UI development)
- `cd frontend && npm run dev` - Start Vite development server
- `cd frontend && npm run build` - Build frontend assets

## Architecture Overview

This is a **Wails v2** desktop application that benchmarks LLM APIs through OpenAI-compatible endpoints.

### Core Service Architecture
- **app.go** - Central controller exposing methods to frontend via Wails binding
- **speed_test_service.go** - Concurrent test execution engine using goroutines and semaphores
- **openai_client.go** - API communication layer with timeout handling and model discovery
- **export_service.go** - Multi-format data export (CSV, JSON, PNG charts)

### Frontend-Backend Communication
- **Automatic TypeScript Generation**: Go structs generate TypeScript definitions in `frontend/wailsjs/go/main/`
- **Channel-based Updates**: Real-time progress via Go channels (buffered, size 100)
- **Method Binding**: Backend methods directly callable from frontend through Wails bridge

### Concurrency Patterns
- **Semaphore Pattern**: Controlled concurrent API requests (configurable concurrency)
- **Channel Communication**: Non-blocking progress updates and result streaming
- **Thread Safety**: Mutex-protected shared state in test batch management

## Key Development Patterns

### Adding New Backend Methods
1. Add method to `App` struct in `app.go`
2. Method automatically becomes available in frontend via Wails binding
3. Generated TypeScript definition appears in `frontend/wailsjs/go/main/App.d.ts`

### Working with Test Execution
- Test batches managed with RWMutex for thread safety
- Progress updates sent through dedicated channels
- Results aggregated concurrently with proper synchronization

### API Integration
- OpenAI-compatible endpoints supported with custom headers
- Model discovery via `/v1/models` endpoint
- Validation against actual API endpoints in `test_validation.go`

### Data Export
- Export service handles CSV, JSON, and chart generation
- Timestamped files organized in `exports/` directory
- Comparison reports for multi-batch analysis

## Important Technical Details

### Wails Framework Integration
- Frontend embedded in Go binary using `//go:embed` directive
- Development mode serves frontend from Vite dev server
- Production build compiles frontend assets into binary

### Error Handling
- API timeouts and retries handled in `openai_client.go`
- Validation errors returned with detailed messages
- Failed tests recorded with error details in results

### Configuration Validation
- Real API key validation against specified endpoint
- Model availability checked dynamically
- Prompt configuration validated before test execution