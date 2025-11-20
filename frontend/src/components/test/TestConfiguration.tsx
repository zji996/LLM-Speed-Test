import React, { useState, useEffect } from 'react';
import { TestConfiguration, ModelOption } from '../../types';
import { useModelSelection } from '../../hooks';
import { Button, Card, Input, Select } from '../common';
import { PROMPT_LENGTHS } from '../../utils';

const MAX_TEST_ROUNDS = 100;
const MAX_CONCURRENT_TESTS = 50;

interface TestConfigurationProps {
  onStartTest: (config: TestConfiguration) => void;
  isRunning: boolean;
}

const TestConfigurationComponent: React.FC<TestConfigurationProps> = ({ onStartTest, isRunning }) => {
  const [config, setConfig] = useState<TestConfiguration>({
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
    promptType: 'fixed',
    promptLength: 512,
    prompt: '',
    maxTokens: 128,
    temperature: 1.0,
    topP: 0.1,
    presencePenalty: -1.0,
    frequencyPenalty: -1.0,
    testCount: 10,
    concurrentTests: 3,
    timeout: 60,
    headers: {}
  });

  const { availableModels, isLoading, error, fetchModels } = useModelSelection();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<string>('');

  useEffect(() => {
    // Load default configuration from backend and merge with saved config
    const loadDefaults = async () => {
      try {
        const { GetDefaultTestConfiguration } = await import('../../../wailsjs/go/main/App');
        const defaultConfig = await GetDefaultTestConfiguration();

        // Load saved configuration from localStorage
        const savedEndpoint = localStorage.getItem('apiEndpoint');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedModel = localStorage.getItem('selectedModel');

        // IMPORTANT: Preserve API endpoint, key and selected model from localStorage
        // but use defaults for other settings (like prompt lengths, tokens, etc.)
        const mergedConfig = {
          ...defaultConfig,
          apiEndpoint: savedEndpoint || defaultConfig.apiEndpoint,
          apiKey: savedApiKey || defaultConfig.apiKey,
          model: savedModel || '', // CRITICAL: Preserve selected model, start with empty string
          promptType: 'fixed',
          prompt: ''
        };

        setConfig(mergedConfig);

        // If we have saved API key and endpoint, automatically fetch models
        if (savedApiKey && savedEndpoint) {
          fetchModels(savedEndpoint, savedApiKey);
        }
      } catch (error) {
        console.error('Failed to load defaults:', error);
      }
    };

    loadDefaults();
  }, []);

  const handleInputChange = (field: keyof TestConfiguration, value: any) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [field]: value
      };

      // Save API configuration to localStorage
      if (field === 'apiEndpoint') {
        try {
          localStorage.setItem('apiEndpoint', value);
        } catch (error) {
          console.error('Failed to save apiEndpoint:', error);
        }
      } else if (field === 'apiKey') {
        try {
          localStorage.setItem('apiKey', value);
        } catch (error) {
          console.error('Failed to save apiKey:', error);
        }
      } else if (field === 'model') {
        // CRITICAL: Save selected model to localStorage
        try {
          if (value) {
            localStorage.setItem('selectedModel', value);
          } else {
            localStorage.removeItem('selectedModel');
          }
        } catch (error) {
          console.error('Failed to save selectedModel:', error);
        }
      }

      return newConfig;
    });

  };

  const handleValidateAPI = async () => {
    if (!config.apiKey) {
      setValidationError('请输入API密钥');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const { ValidateAPIKey } = await import('../../../wailsjs/go/main/App');
      await ValidateAPIKey(config.apiEndpoint, config.apiKey);
      await fetchModels(config.apiEndpoint, config.apiKey);
    } catch (error) {
      setValidationError(`API验证失败: ${error}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartTest = async () => {
    // Debug: Log the actual configuration being used
    console.log('Starting speed test with configuration:', {
      model: config.model,
      endpoint: config.apiEndpoint,
      testCount: config.testCount,
      concurrent: config.concurrentTests,
      totalRequests: config.testCount * config.concurrentTests
    });

    // Validation
    if (!config.apiKey) {
      setValidationError('请输入API密钥');
      return;
    }

    if (!config.model) {
      setValidationError('请选择模型');
      return;
    }

    // CRITICAL: Verify the selected model is in the available models list
    const isModelValid = availableModels.some(m => m.id === config.model);
    if (!isModelValid) {
      setValidationError(`选择的模型 "${config.model}" 不在可用模型列表中，请先验证API`);
      return;
    }

    if (config.testCount < 1 || config.testCount > MAX_TEST_ROUNDS) {
      setValidationError(`测试轮次必须在1-${MAX_TEST_ROUNDS}之间`);
      return;
    }

    if (config.concurrentTests < 1 || config.concurrentTests > MAX_CONCURRENT_TESTS) {
      setValidationError(`并发数必须在1-${MAX_CONCURRENT_TESTS}之间`);
      return;
    }

    // Validate prompt configuration
    try {
      const { ValidatePromptConfig } = await import('../../../wailsjs/go/main/App');
      await ValidatePromptConfig(config.promptType, config.promptLength);
    } catch (error) {
      setValidationError(`提示词配置错误: ${error}`);
      return;
    }

    // Parse custom headers
    let headers = {};
    if (customHeaders.trim()) {
      try {
        headers = JSON.parse(customHeaders);
      } catch (error) {
        setValidationError('自定义请求头格式错误');
        return;
      }
    }

    const finalConfig = {
      ...config,
      promptType: 'fixed',
      prompt: '',
      headers
    };

    onStartTest(finalConfig);
  };

  const modelOptions = availableModels.map(model => ({
    value: model.id,
    label: model.name
  }));

  const promptLengthOptions = PROMPT_LENGTHS.map(length => ({
    value: length.toString(),
    label: `${length} tokens`
  }));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          LLM 性能测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          测试和比较大型语言模型的推理速度性能
        </p>
      </div>

      {/* API Configuration Card */}
      <Card>
        <div className="card-header">
          <h2 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            API 配置
          </h2>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="API 端点"
              value={config.apiEndpoint}
              onChange={(value) => handleInputChange('apiEndpoint', value)}
              placeholder="https://api.openai.com/v1"
              disabled={isRunning}
            />
            <Input
              label="API 密钥"
              type="password"
              value={config.apiKey}
              onChange={(value) => handleInputChange('apiKey', value)}
              placeholder="输入您的 API 密钥"
              disabled={isRunning}
              required
            />
          </div>
          <div className="flex justify-between items-center">
            <Button
              onClick={() => {
                try {
                  localStorage.removeItem('apiEndpoint');
                  localStorage.removeItem('apiKey');
                  setConfig(prev => ({
                    ...prev,
                    apiEndpoint: 'https://api.openai.com/v1',
                    apiKey: ''
                  }));
                  setValidationError('已清除保存的 API 配置');
                } catch (error) {
                  console.error('Failed to clear saved config:', error);
                }
              }}
              disabled={isRunning}
              variant="secondary"
              size="sm"
            >
              清除配置
            </Button>
            <Button
              onClick={handleValidateAPI}
              disabled={isValidating || isRunning}
              loading={isValidating}
              variant="primary"
            >
              {isValidating ? '验证中...' : '验证 API'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Model Configuration Card */}
      <Card>
        <div className="card-header">
          <h2 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 3V1m0 18v-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            模型配置
          </h2>
        </div>
        <div className="card-content space-y-4">
          <Select
            label="模型选择"
            value={config.model}
            onChange={(value) => handleInputChange('model', value)}
            options={modelOptions}
            disabled={isRunning}
            placeholder="请选择模型"
            required
          />
          <Select
            label="提示词长度 (tokens)"
            value={config.promptLength.toString()}
            onChange={(value) => handleInputChange('promptLength', parseInt(value))}
            options={promptLengthOptions}
            disabled={isRunning}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            提示词类型已固定为固定长度，您只需选择需要的提示词长度即可。
          </p>
        </div>
      </Card>

      {/* Test Parameters Card */}
      <Card>
        <div className="card-header">
          <h2 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            测试参数
          </h2>
        </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="测试轮次 (提交次数)"
                type="number"
                value={config.testCount}
                onChange={(value) => handleInputChange('testCount', parseInt(value))}
                disabled={isRunning}
                min={1}
                max={MAX_TEST_ROUNDS}
                required
              />
              <Input
                label="并发数"
                type="number"
                value={config.concurrentTests}
                onChange={(value) => handleInputChange('concurrentTests', parseInt(value))}
                disabled={isRunning}
                min={1}
                max={MAX_CONCURRENT_TESTS}
                required
              />
              <Input
                label="最大输出长度"
                type="number"
              value={config.maxTokens}
              onChange={(value) => handleInputChange('maxTokens', parseInt(value))}
              disabled={isRunning}
              min={1}
              max={4096}
                required
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              总请求数 = 测试轮次 ({config.testCount || 0}) × 并发数 ({config.concurrentTests || 0}) ={' '}
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {config.testCount > 0 && config.concurrentTests > 0 ? config.testCount * config.concurrentTests : 0}
              </span>
            </p>

          {/* Advanced Parameters */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className={`w-4 h-4 mr-2 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              高级参数
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Temperature"
                    type="number"
                    value={config.temperature}
                    onChange={(value) => handleInputChange('temperature', parseFloat(value))}
                    disabled={isRunning}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                  <Input
                    label="Top P"
                    type="number"
                    value={config.topP}
                    onChange={(value) => handleInputChange('topP', parseFloat(value))}
                    disabled={isRunning}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="存在惩罚 (Presence Penalty)"
                    type="number"
                    value={config.presencePenalty}
                    onChange={(value) => handleInputChange('presencePenalty', parseFloat(value))}
                    disabled={isRunning}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                  <Input
                    label="频率惩罚 (Frequency Penalty)"
                    type="number"
                    value={config.frequencyPenalty}
                    onChange={(value) => handleInputChange('frequencyPenalty', parseFloat(value))}
                    disabled={isRunning}
                    min={-2}
                    max={2}
                    step={0.1}
                  />
                </div>
                <Input
                  label="超时时间 (秒)"
                  type="number"
                  value={config.timeout}
                  onChange={(value) => handleInputChange('timeout', parseInt(value))}
                  disabled={isRunning}
                  min={10}
                  max={300}
                />
                <div className="form-group">
                  <label className="form-label">自定义请求头 (JSON)</label>
                  <textarea
                    value={customHeaders}
                    onChange={(e) => setCustomHeaders(e.target.value)}
                    rows={3}
                    placeholder='{"X-Custom-Header": "value"}'
                    disabled={isRunning}
                    className="form-textarea"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {validationError && (
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 animate-slide-up">
          <div className="flex">
            <svg className="w-5 h-5 text-error-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-error-800 dark:text-error-200">{validationError}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={handleStartTest}
          disabled={isRunning}
          loading={isRunning}
          variant="primary"
          size="lg"
        >
          {isRunning ? '测试中...' : '开始性能测试'}
        </Button>
      </div>
    </div>
  );
};

export default TestConfigurationComponent;
