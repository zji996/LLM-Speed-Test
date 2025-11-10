import { TestConfiguration } from '../types';

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
  if (testCount < 1 || testCount > 100) {
    return '测试次数必须在1-100之间';
  }
  return null;
};

export const validateConcurrentTests = (concurrentTests: number, testCount: number): string | null => {
  if (concurrentTests < 1 || concurrentTests > testCount) {
    return '并发数必须在1-测试次数之间';
  }
  return null;
};

export const validateCustomPrompt = (promptType: string, prompt: string): string | null => {
  if (promptType === 'custom' && !prompt.trim()) {
    return '请输入自定义提示词';
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

  const concurrentError = validateConcurrentTests(config.concurrentTests, config.testCount);
  if (concurrentError) return concurrentError;

  const promptError = validateCustomPrompt(config.promptType, config.prompt);
  if (promptError) return promptError;

  return null;
};