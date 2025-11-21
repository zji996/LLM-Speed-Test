import { RoundSummary, TestBatch } from '../types';

interface RoundAccumulator {
  summary: RoundSummary;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalPrefillLatency: number;
  totalOutputLatency: number;
  totalLatency: number;
  totalPrefillTPS: number;
  totalOutputTPS: number;
  prefillSamples: number;
  outputSamples: number;
}

const createEmptySummary = (roundNumber: number): RoundSummary => ({
  roundNumber,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  successRate: 0,
  averagePromptTokens: 0,
  averageCompletionTokens: 0,
  averageTotalTokens: 0,
  averagePrefillLatency: 0,
  averageOutputLatency: 0,
  averageTotalLatency: 0,
  averagePrefillTokensPerSecond: 0,
  totalPrefillTokensPerSecond: 0,
  averageOutputTokensPerSecond: 0,
  totalOutputTokensPerSecond: 0,
});

export const computeRoundSummaries = (batch: TestBatch): RoundSummary[] => {
  if (batch.roundSummaries && batch.roundSummaries.length > 0) {
    return batch.roundSummaries;
  }

  if (!batch.results || batch.results.length === 0) {
    return [];
  }

  const concurrency = Math.max(batch.configuration.concurrentTests || 1, 1);
  const accMap = new Map<number, RoundAccumulator>();

  const getAccumulator = (roundNumber: number): RoundAccumulator => {
    let accumulator = accMap.get(roundNumber);
    if (!accumulator) {
      accumulator = {
        summary: createEmptySummary(roundNumber),
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalPrefillLatency: 0,
        totalOutputLatency: 0,
        totalLatency: 0,
        totalPrefillTPS: 0,
        totalOutputTPS: 0,
        prefillSamples: 0,
        outputSamples: 0,
      };
      accMap.set(roundNumber, accumulator);
    }
    return accumulator;
  };

  batch.results.forEach((result, index) => {
    const roundNumber = result.roundNumber || Math.floor(index / concurrency) + 1;
    const accumulator = getAccumulator(roundNumber);

    accumulator.summary.totalRequests += 1;

    if (result.success) {
      accumulator.summary.successfulRequests += 1;
      accumulator.totalPromptTokens += result.promptTokens;
      accumulator.totalCompletionTokens += result.completionTokens;
      accumulator.totalTokens += result.totalTokens;
      accumulator.totalPrefillLatency += result.requestLatency;
      accumulator.totalOutputLatency += result.outputLatency;
      accumulator.totalLatency += result.totalLatency;

      if (result.prefillTokensPerSecond > 0) {
        accumulator.totalPrefillTPS += result.prefillTokensPerSecond;
        accumulator.prefillSamples += 1;
      }
      if (result.outputTokensPerSecond > 0) {
        accumulator.totalOutputTPS += result.outputTokensPerSecond;
        accumulator.outputSamples += 1;
      }
      accumulator.summary.totalPrefillTokensPerSecond += result.prefillTokensPerSecond;
      accumulator.summary.totalOutputTokensPerSecond += result.outputTokensPerSecond;
    } else {
      accumulator.summary.failedRequests += 1;
    }
  });

  const roundSummaries = Array.from(accMap.values())
    .map((accumulator) => {
      const { summary } = accumulator;

      if (summary.totalRequests > 0) {
        summary.successRate = summary.successfulRequests / summary.totalRequests;
      }

      if (summary.successfulRequests > 0) {
        const denom = summary.successfulRequests;
        summary.averagePromptTokens = accumulator.totalPromptTokens / denom;
        summary.averageCompletionTokens = accumulator.totalCompletionTokens / denom;
        summary.averageTotalTokens = accumulator.totalTokens / denom;
        summary.averagePrefillLatency = accumulator.totalPrefillLatency / denom;
        summary.averageOutputLatency = accumulator.totalOutputLatency / denom;
        summary.averageTotalLatency = accumulator.totalLatency / denom;

        if (accumulator.prefillSamples > 0) {
          summary.averagePrefillTokensPerSecond = accumulator.totalPrefillTPS / accumulator.prefillSamples;
        }
        if (accumulator.outputSamples > 0) {
          summary.averageOutputTokensPerSecond = accumulator.totalOutputTPS / accumulator.outputSamples;
        }
      }

      return summary;
    })
    .sort((a, b) => a.roundNumber - b.roundNumber);

  return roundSummaries;
};
