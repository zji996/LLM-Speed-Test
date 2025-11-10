# LLM Speed Test Application

A cross-platform desktop application for testing and comparing the performance of Large Language Models (LLMs) through OpenAI-compatible APIs.

## Features

### Core Functionality
- **OpenAI-Compatible API Support**: Works with OpenAI, Azure OpenAI, and other compatible endpoints
- **Comprehensive Speed Testing**: Measures latency, throughput, and tokens per second
- **Configurable Test Parameters**: Customizable prompts, token limits, temperature, and test count
- **Concurrent Testing**: Supports parallel test execution for faster results
- **Real-time Progress Monitoring**: Live updates during test execution

### Data Analysis & Visualization
- **Interactive Charts**: Visual representation of test results (latency, throughput, tokens/second)
- **Detailed Metrics**: Average, minimum, maximum values for all performance indicators
- **Test Comparison**: Compare performance across different models or configurations
- **Individual Test Results**: Detailed breakdown of each test execution

### Export Capabilities
- **CSV Export**: Export test results and summary statistics to CSV format
- **JSON Export**: Complete test data export for further analysis
- **Chart Export**: Export visualizations as images (PNG format)
- **Batch Comparison**: Export comparison data between multiple test runs

### User Experience
- **Modern UI**: Clean, intuitive interface with tabbed navigation
- **Test History**: Keep track of previous test runs
- **Dark Mode Support**: Automatic dark mode detection
- **Responsive Design**: Works on different screen sizes
- **Error Handling**: Comprehensive error reporting and validation

## Architecture

### Backend (Go)
- **Wails v2 Framework**: Cross-platform desktop application framework
- **OpenAI API Client**: Custom HTTP client for OpenAI-compatible APIs
- **Speed Test Service**: Core testing logic with concurrent execution
- **Export Service**: Multi-format data export functionality
- **Data Models**: Structured representation of test configurations and results

### Frontend (React TypeScript)
- **Modern React**: Functional components with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Custom Components**: Modular UI components for different features

## Installation

### Prerequisites
- Go 1.23 or later
- Node.js 16 or later
- Wails v2 CLI

### Build from Source
```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Clone the repository
git clone <repository-url>
cd LLM-Speed-Test

# Install dependencies and build
wails build
```

### Run in Development Mode
```bash
wails dev
```

## Usage

### 1. Configuration
- Set your API endpoint (default: https://api.openai.com/v1)
- Enter your API key
- Select the model you want to test
- Configure test parameters:
  - Test prompt
  - Max tokens
  - Temperature
  - Number of tests
  - Concurrent test limit
  - Timeout

### 2. Validate API
- Click "Validate API" to verify your credentials
- The application will attempt to fetch available models

### 3. Run Tests
- Click "Start Speed Test" to begin testing
- Monitor progress in real-time
- View detailed results when complete

### 4. Analyze Results
- View summary statistics
- Examine individual test results
- Compare different test runs
- Export data in various formats

### 5. Visualize Data
- Switch to the Charts tab
- View latency, throughput, and tokens per second charts
- Analyze performance trends

## Configuration Options

### API Configuration
- **API Endpoint**: URL of the OpenAI-compatible API
- **API Key**: Authentication key for the API
- **Model**: Specific model to test

### Test Parameters
- **Test Prompt**: The prompt sent to the model
- **Max Tokens**: Maximum tokens in the response
- **Temperature**: Creativity/randomness parameter (0-2)
- **Test Count**: Number of tests to run (1-100)
- **Concurrent Tests**: Parallel execution limit
- **Timeout**: Request timeout in seconds (10-300)

### Advanced Settings
- **Custom Headers**: Additional HTTP headers as JSON

## Performance Metrics

### Latency
- **Request Latency**: Time to first token
- **Total Latency**: Complete request time
- **Average/Min/Max**: Statistical analysis

### Throughput
- **Tokens per Second**: Rate of token generation
- **Throughput**: Overall processing speed
- **Average/Min/Max**: Statistical analysis

### Reliability
- **Success Rate**: Percentage of successful requests
- **Error Tracking**: Failed request details

## Export Formats

### CSV
- Test results with individual metrics
- Summary statistics
- Comparison data

### JSON
- Complete test data structure
- All configuration and result details
- Suitable for programmatic processing

### PNG (Charts)
- Visual representations of test results
- Latency, throughput, and tokens per second charts
- High-quality images for reports

## Technical Details

### Data Models
- `TestConfiguration`: Test setup parameters
- `TestResult`: Individual test execution results
- `TestBatch`: Complete test run with all results
- `TestSummary`: Aggregated statistics
- `ProgressUpdate`: Real-time progress information

### API Integration
- HTTP client with timeout handling
- Error handling and retry logic
- Support for custom headers
- Model enumeration

### Concurrency
- Configurable parallel test execution
- Semaphore-based concurrency control
- Thread-safe result collection

## Troubleshooting

### Common Issues
1. **API Key Invalid**: Verify your API key is correct
2. **Model Not Found**: Check available models with "Validate API"
3. **Network Timeout**: Increase timeout value
4. **Rate Limiting**: Reduce concurrent test count

### Debug Information
- Check console logs for detailed error messages
- Export test data for analysis
- Monitor network requests in development mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Wails framework for cross-platform desktop development
- OpenAI for the API specification
- React and TypeScript communities

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the GitHub issues
3. Create a new issue with detailed information

---

**Note**: This application is designed for testing and benchmarking purposes. Always respect API rate limits and terms of service when testing external APIs.