import { TestConfiguration } from '../types';

const MAX_TEST_ROUNDS = 100;
const MAX_CONCURRENT_TESTS = 50;

export const validateApiKey = (apiKey: string): string | null => {
  if (!apiKey || apiKey.trim().length === 0) {
    return '请输入API密钥';
  }
  if (apiKey.length < 10) {
    return 'API密钥格式不正确';
  }
  return null;
};

export const validateModelSelection = (model: string): string | null => {
  if (!model || model.trim().length === 0) {
    return '请选择模型';
  }
  return null;
};

export const validateTestCount = (testCount: number): string | null => {
  if (testCount < 1 || testCount > MAX_TEST_ROUNDS) {
    return `测试轮次必须在1-${MAX_TEST_ROUNDS}之间`;
  }
  return null;
};

export const validateConcurrentTests = (concurrentTests: number): string | null => {
  if (concurrentTests < 1 || concurrentTests > MAX_CONCURRENT_TESTS) {
    return `并发数必须在1-${MAX_CONCURRENT_TESTS}之间`;
  }
  return null;
};

export const validateConfiguration = (config: TestConfiguration): string | null => {
  const apiKeyError = validateApiKey(config.apiKey);
  if (apiKeyError) return apiKeyError;

  const modelError = validateModelSelection(config.model);
  if (modelError) return modelError;

  const testCountError = validateTestCount(config.testCount);
  if (testCountError) return testCountError;

  const concurrentError = validateConcurrentTests(config.concurrentTests);
  if (concurrentError) return concurrentError;

  return null;
};
