export namespace main {
	
	export class ComparisonSummary {
	    bestLatencyBatchId: string;
	    bestThroughputBatchId: string;
	    bestRoundThroughputBatchId: string;
	    lowestErrorRateBatchId: string;
	
	    static createFrom(source: any = {}) {
	        return new ComparisonSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bestLatencyBatchId = source["bestLatencyBatchId"];
	        this.bestThroughputBatchId = source["bestThroughputBatchId"];
	        this.bestRoundThroughputBatchId = source["bestRoundThroughputBatchId"];
	        this.lowestErrorRateBatchId = source["lowestErrorRateBatchId"];
	    }
	}
	export class TestSummary {
	    totalTests: number;
	    successfulTests: number;
	    failedTests: number;
	    averageLatency: number;
	    minLatency: number;
	    maxLatency: number;
	    averagePrefillLatency: number;
	    minPrefillLatency: number;
	    maxPrefillLatency: number;
	    averageOutputLatency: number;
	    minOutputLatency: number;
	    maxOutputLatency: number;
	    averagePrefillTokensPerSecond: number;
	    minPrefillTokensPerSecond: number;
	    maxPrefillTokensPerSecond: number;
	    averageOutputTokensPerSecond: number;
	    minOutputTokensPerSecond: number;
	    maxOutputTokensPerSecond: number;
	    averageThroughput: number;
	    minThroughput: number;
	    maxThroughput: number;
	    averageRoundThroughput: number;
	    minRoundThroughput: number;
	    maxRoundThroughput: number;
	    errorRate: number;
	
	    static createFrom(source: any = {}) {
	        return new TestSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalTests = source["totalTests"];
	        this.successfulTests = source["successfulTests"];
	        this.failedTests = source["failedTests"];
	        this.averageLatency = source["averageLatency"];
	        this.minLatency = source["minLatency"];
	        this.maxLatency = source["maxLatency"];
	        this.averagePrefillLatency = source["averagePrefillLatency"];
	        this.minPrefillLatency = source["minPrefillLatency"];
	        this.maxPrefillLatency = source["maxPrefillLatency"];
	        this.averageOutputLatency = source["averageOutputLatency"];
	        this.minOutputLatency = source["minOutputLatency"];
	        this.maxOutputLatency = source["maxOutputLatency"];
	        this.averagePrefillTokensPerSecond = source["averagePrefillTokensPerSecond"];
	        this.minPrefillTokensPerSecond = source["minPrefillTokensPerSecond"];
	        this.maxPrefillTokensPerSecond = source["maxPrefillTokensPerSecond"];
	        this.averageOutputTokensPerSecond = source["averageOutputTokensPerSecond"];
	        this.minOutputTokensPerSecond = source["minOutputTokensPerSecond"];
	        this.maxOutputTokensPerSecond = source["maxOutputTokensPerSecond"];
	        this.averageThroughput = source["averageThroughput"];
	        this.minThroughput = source["minThroughput"];
	        this.maxThroughput = source["maxThroughput"];
	        this.averageRoundThroughput = source["averageRoundThroughput"];
	        this.minRoundThroughput = source["minRoundThroughput"];
	        this.maxRoundThroughput = source["maxRoundThroughput"];
	        this.errorRate = source["errorRate"];
	    }
	}
	export class RoundSummary {
	    roundNumber: number;
	    totalRequests: number;
	    successfulRequests: number;
	    failedRequests: number;
	    successRate: number;
	    averagePromptTokens: number;
	    averageCompletionTokens: number;
	    averageTotalTokens: number;
	    averagePrefillLatency: number;
	    averageOutputLatency: number;
	    averageTotalLatency: number;
	    averagePrefillTokensPerSecond: number;
	    totalPrefillTokensPerSecond: number;
	    averageOutputTokensPerSecond: number;
	    totalOutputTokensPerSecond: number;
	
	    static createFrom(source: any = {}) {
	        return new RoundSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.roundNumber = source["roundNumber"];
	        this.totalRequests = source["totalRequests"];
	        this.successfulRequests = source["successfulRequests"];
	        this.failedRequests = source["failedRequests"];
	        this.successRate = source["successRate"];
	        this.averagePromptTokens = source["averagePromptTokens"];
	        this.averageCompletionTokens = source["averageCompletionTokens"];
	        this.averageTotalTokens = source["averageTotalTokens"];
	        this.averagePrefillLatency = source["averagePrefillLatency"];
	        this.averageOutputLatency = source["averageOutputLatency"];
	        this.averageTotalLatency = source["averageTotalLatency"];
	        this.averagePrefillTokensPerSecond = source["averagePrefillTokensPerSecond"];
	        this.totalPrefillTokensPerSecond = source["totalPrefillTokensPerSecond"];
	        this.averageOutputTokensPerSecond = source["averageOutputTokensPerSecond"];
	        this.totalOutputTokensPerSecond = source["totalOutputTokensPerSecond"];
	    }
	}
	export class TestResult {
	    id: string;
	    timestamp: string;
	    configuration: TestConfiguration;
	    testNumber: number;
	    roundNumber: number;
	    roundPosition: number;
	    actualConcurrency: number;
	    promptTokens: number;
	    completionTokens: number;
	    totalTokens: number;
	    requestLatency: number;
	    totalLatency: number;
	    outputLatency: number;
	    prefillTokensPerSecond: number;
	    outputTokensPerSecond: number;
	    throughput: number;
	    error?: string;
	    success: boolean;
	    response?: string;
	
	    static createFrom(source: any = {}) {
	        return new TestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.configuration = this.convertValues(source["configuration"], TestConfiguration);
	        this.testNumber = source["testNumber"];
	        this.roundNumber = source["roundNumber"];
	        this.roundPosition = source["roundPosition"];
	        this.actualConcurrency = source["actualConcurrency"];
	        this.promptTokens = source["promptTokens"];
	        this.completionTokens = source["completionTokens"];
	        this.totalTokens = source["totalTokens"];
	        this.requestLatency = source["requestLatency"];
	        this.totalLatency = source["totalLatency"];
	        this.outputLatency = source["outputLatency"];
	        this.prefillTokensPerSecond = source["prefillTokensPerSecond"];
	        this.outputTokensPerSecond = source["outputTokensPerSecond"];
	        this.throughput = source["throughput"];
	        this.error = source["error"];
	        this.success = source["success"];
	        this.response = source["response"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StepConfiguration {
	    start: number;
	    end: number;
	    step: number;
	
	    static createFrom(source: any = {}) {
	        return new StepConfiguration(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start = source["start"];
	        this.end = source["end"];
	        this.step = source["step"];
	    }
	}
	export class TestConfiguration {
	    apiEndpoint: string;
	    apiKey: string;
	    model: string;
	    promptType: string;
	    promptLength: number;
	    prompt: string;
	    maxTokens: number;
	    temperature: number;
	    topP: number;
	    presencePenalty: number;
	    frequencyPenalty: number;
	    testMode: string;
	    stepConfig: StepConfiguration;
	    testCount: number;
	    concurrentTests: number;
	    timeout: number;
	    headers?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new TestConfiguration(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.apiEndpoint = source["apiEndpoint"];
	        this.apiKey = source["apiKey"];
	        this.model = source["model"];
	        this.promptType = source["promptType"];
	        this.promptLength = source["promptLength"];
	        this.prompt = source["prompt"];
	        this.maxTokens = source["maxTokens"];
	        this.temperature = source["temperature"];
	        this.topP = source["topP"];
	        this.presencePenalty = source["presencePenalty"];
	        this.frequencyPenalty = source["frequencyPenalty"];
	        this.testMode = source["testMode"];
	        this.stepConfig = this.convertValues(source["stepConfig"], StepConfiguration);
	        this.testCount = source["testCount"];
	        this.concurrentTests = source["concurrentTests"];
	        this.timeout = source["timeout"];
	        this.headers = source["headers"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TestBatch {
	    id: string;
	    startTime: string;
	    endTime: string;
	    configuration: TestConfiguration;
	    results: TestResult[];
	    roundSummaries?: RoundSummary[];
	    summary: TestSummary;
	
	    static createFrom(source: any = {}) {
	        return new TestBatch(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.configuration = this.convertValues(source["configuration"], TestConfiguration);
	        this.results = this.convertValues(source["results"], TestResult);
	        this.roundSummaries = this.convertValues(source["roundSummaries"], RoundSummary);
	        this.summary = this.convertValues(source["summary"], TestSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ComparisonResult {
	    batches: TestBatch[];
	    comparison: ComparisonSummary;
	
	    static createFrom(source: any = {}) {
	        return new ComparisonResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.batches = this.convertValues(source["batches"], TestBatch);
	        this.comparison = this.convertValues(source["comparison"], ComparisonSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ExportOptions {
	    includeCharts: boolean;
	    chartTypes?: string[];
	    dateFormat?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.includeCharts = source["includeCharts"];
	        this.chartTypes = source["chartTypes"];
	        this.dateFormat = source["dateFormat"];
	    }
	}
	export class ProgressUpdate {
	    testId: string;
	    batchId: string;
	    testNumber: number;
	    totalTests: number;
	    status: string;
	    message?: string;
	
	    static createFrom(source: any = {}) {
	        return new ProgressUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.testId = source["testId"];
	        this.batchId = source["batchId"];
	        this.testNumber = source["testNumber"];
	        this.totalTests = source["totalTests"];
	        this.status = source["status"];
	        this.message = source["message"];
	    }
	}
	
	
	export class TelemetryUpdate {
	    timestamp: number;
	    activeTests: number;
	    completedTests: number;
	    totalTests: number;
	    generatedTokens: number;
	    instantTPS: number;
	    averageTTFT: number;
	    p95TTFT: number;
	    stepCurrent: number;
	    stepTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new TelemetryUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = source["timestamp"];
	        this.activeTests = source["activeTests"];
	        this.completedTests = source["completedTests"];
	        this.totalTests = source["totalTests"];
	        this.generatedTokens = source["generatedTokens"];
	        this.instantTPS = source["instantTPS"];
	        this.averageTTFT = source["averageTTFT"];
	        this.p95TTFT = source["p95TTFT"];
	        this.stepCurrent = source["stepCurrent"];
	        this.stepTotal = source["stepTotal"];
	    }
	}
	
	
	

}

