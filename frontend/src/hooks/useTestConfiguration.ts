import { useEffect, useState } from 'react';
import { StepConfiguration, TestConfiguration, TestMode } from '../types';
import { useModelSelection } from './useModelSelection';
import { PROMPT_LENGTHS } from '../utils';

export const MAX_TEST_ROUNDS = 100;
export const MAX_CONCURRENT_TESTS = 50;

export interface UseTestConfigurationOptions {
  onStartTest: (config: TestConfiguration) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

export interface UseTestConfigurationResult {
  mode: TestMode;
  setMode: (mode: TestMode) => void;

  config: TestConfiguration;
  setConfig: React.Dispatch<React.SetStateAction<TestConfiguration>>;

  concurrencyStepConfig: StepConfiguration;
  setConcurrencyStepConfig: React.Dispatch<React.SetStateAction<StepConfiguration>>;
  concurrencyStepCount: number;
  setConcurrencyStepCount: (value: number) => void;

  inputStepConfig: StepConfiguration;
  setInputStepConfig: React.Dispatch<React.SetStateAction<StepConfiguration>>;
  inputStepCount: number;
  setInputStepCount: (value: number) => void;

  isValidating: boolean;
  validationError: string;
  setValidationError: (message: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
  customHeaders: string;
  setCustomHeaders: (value: string) => void;

  availableModels: ReturnType<typeof useModelSelection>['availableModels'];
  isLoadingModels: boolean;
  modelError: string | null;

  modelOptions: SelectOption[];
  promptLengthOptions: SelectOption[];

  handleInputChange: (field: keyof TestConfiguration, value: any) => void;
  handleValidateAPI: () => Promise<void>;
  handleStartTest: () => Promise<void>;
}

export const useTestConfiguration = (
  options: UseTestConfigurationOptions
): UseTestConfigurationResult => {
  const { onStartTest } = options;

  const [mode, setMode] = useState<TestMode>('normal');

  const [concurrencyStepConfig, setConcurrencyStepConfig] = useState<StepConfiguration>({
    start: 1,
    end: 10,
    step: 1,
  });
  const [concurrencyStepCount, setConcurrencyStepCount] = useState<number>(10);

  const [inputStepConfig, setInputStepConfig] = useState<StepConfiguration>({
    start: 2048,
    end: 2048 * 3,
    step: 2048,
  });
  const [inputStepCount, setInputStepCount] = useState<number>(3);

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
    testMode: 'normal',
    stepConfig: { start: 1, end: 10, step: 1 },
    testCount: 2,
    concurrentTests: 3,
    timeout: 60,
    headers: {},
  });

  const { availableModels, isLoading, error, fetchModels } = useModelSelection();

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<string>('');

  // Load defaults from backend and localStorage
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const { GetDefaultTestConfiguration } = await import('../wailsjs/go/main/App');
        const defaultConfig = (await GetDefaultTestConfiguration()) as TestConfiguration;
        const savedEndpoint = localStorage.getItem('apiEndpoint');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedModel = localStorage.getItem('selectedModel');
        const savedStateRaw = localStorage.getItem('testConfigStateV1');

        let mergedConfig: TestConfiguration = {
          ...defaultConfig,
          apiEndpoint: savedEndpoint || defaultConfig.apiEndpoint,
          apiKey: savedApiKey || defaultConfig.apiKey,
          model: savedModel || '',
          promptType: 'fixed',
          prompt: '',
          testMode: 'normal',
          stepConfig: { start: 1, end: 10, step: 1 },
        };

        let restoredMode: TestMode = 'normal';

        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw);
            if (savedState.config) {
              mergedConfig = {
                ...mergedConfig,
                ...savedState.config,
              };
            }
            if (savedState.mode) {
              restoredMode = savedState.mode as TestMode;
            }
            if (savedState.concurrencyStepConfig) {
              setConcurrencyStepConfig(savedState.concurrencyStepConfig as StepConfiguration);
            }
            if (typeof savedState.concurrencyStepCount === 'number') {
              setConcurrencyStepCount(savedState.concurrencyStepCount as number);
            }
            if (savedState.inputStepConfig) {
              setInputStepConfig(savedState.inputStepConfig as StepConfiguration);
            }
            if (typeof savedState.inputStepCount === 'number') {
              setInputStepCount(savedState.inputStepCount as number);
            }
          } catch (e) {
            console.warn('Failed to restore saved test configuration state:', e);
          }
        }

        mergedConfig = {
          ...mergedConfig,
          promptType: 'fixed',
          prompt: '',
          testMode: 'normal',
        };

        setConfig(mergedConfig);
        setMode(restoredMode);

        if (savedApiKey && savedEndpoint) {
          fetchModels(savedEndpoint, savedApiKey);
        }
      } catch (err) {
        console.error('Failed to load defaults:', err);
      }
    };

    loadDefaults();
  }, [fetchModels]);

  // Persist configuration and step settings
  useEffect(() => {
    try {
      const stateToSave = {
        config,
        mode,
        concurrencyStepConfig,
        concurrencyStepCount,
        inputStepConfig,
        inputStepCount,
      };
      localStorage.setItem('testConfigStateV1', JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('Failed to persist test configuration state:', err);
    }
  }, [config, mode, concurrencyStepConfig, concurrencyStepCount, inputStepConfig, inputStepCount]);

  const handleInputChange = (field: keyof TestConfiguration, value: any) => {
    setConfig(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'apiEndpoint') localStorage.setItem('apiEndpoint', value);
      if (field === 'apiKey') localStorage.setItem('apiKey', value);
      if (field === 'model') {
        if (value) localStorage.setItem('selectedModel', value);
        else localStorage.removeItem('selectedModel');
      }
      return next;
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
      const { ValidateAPIKey } = await import('../wailsjs/go/main/App');
      await ValidateAPIKey(config.apiEndpoint, config.apiKey);
      await fetchModels(config.apiEndpoint, config.apiKey);
    } catch (err) {
      setValidationError(`API验证失败: ${err}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartTest = async () => {
    if (!config.apiKey) {
      setValidationError('请输入API密钥');
      return;
    }
    if (!config.model) {
      setValidationError('请选择模型');
      return;
    }

    const isModelValid = availableModels.some(m => m.id === config.model);
    if (!isModelValid) {
      setValidationError(`选择的模型 "${config.model}" 不在可用模型列表中，请先验证API`);
      return;
    }

    if (config.testCount < 1 || config.testCount > MAX_TEST_ROUNDS) {
      setValidationError(`测试轮次必须在1-${MAX_TEST_ROUNDS}之间`);
      return;
    }

    try {
      const { ValidatePromptConfig } = await import('../wailsjs/go/main/App');
      await ValidatePromptConfig(config.promptType, config.promptLength);
    } catch (err) {
      setValidationError(`提示词配置错误: ${err}`);
      return;
    }

    let headers: Record<string, string> = {};
    if (customHeaders.trim()) {
      try {
        headers = JSON.parse(customHeaders);
      } catch (err) {
        setValidationError('自定义请求头格式错误');
        return;
      }
    }

    let activeStepConfig: StepConfiguration = config.stepConfig;

    if (mode === 'concurrency_step') {
      const safeCount = Math.max(1, concurrencyStepCount || 1);
      const safeStart = concurrencyStepConfig.start > 0 ? concurrencyStepConfig.start : 1;
      const safeStep = concurrencyStepConfig.step > 0 ? concurrencyStepConfig.step : 1;
      const derivedEnd = safeStart + safeStep * (safeCount - 1);
      activeStepConfig = {
        start: safeStart,
        end: derivedEnd,
        step: safeStep,
      };
    } else if (mode === 'input_step') {
      const safeCount = Math.max(1, inputStepCount || 1);
      const safeStart = inputStepConfig.start > 0 ? inputStepConfig.start : 2048;
      const safeStep = inputStepConfig.step > 0 ? inputStepConfig.step : 2048;
      const derivedEnd = safeStart + safeStep * (safeCount - 1);
      activeStepConfig = {
        start: safeStart,
        end: derivedEnd,
        step: safeStep,
      };
    }

    if (mode !== 'normal') {
      if (
        activeStepConfig.start <= 0 ||
        activeStepConfig.end < activeStepConfig.start ||
        activeStepConfig.step <= 0
      ) {
        setValidationError('步进配置无效: 请检查起始值、结束值和步长');
        return;
      }
    }

    const finalConfig: TestConfiguration = {
      ...config,
      testMode: mode,
      stepConfig: activeStepConfig,
      promptType: 'fixed',
      prompt: '',
      headers,
    };

    onStartTest(finalConfig);
  };

  const modelOptions: SelectOption[] = availableModels.map(model => ({
    value: model.id,
    label: model.name,
  }));

  const promptLengthOptions: SelectOption[] = PROMPT_LENGTHS.map(length => ({
    value: length.toString(),
    label: `${length} tokens`,
  }));

  return {
    mode,
    setMode,
    config,
    setConfig,
    concurrencyStepConfig,
    setConcurrencyStepConfig,
    concurrencyStepCount,
    setConcurrencyStepCount,
    inputStepConfig,
    setInputStepConfig,
    inputStepCount,
    setInputStepCount,
    isValidating,
    validationError,
    setValidationError,
    showAdvanced,
    setShowAdvanced,
    customHeaders,
    setCustomHeaders,
    availableModels,
    isLoadingModels: isLoading,
    modelError: error,
    modelOptions,
    promptLengthOptions,
    handleInputChange,
    handleValidateAPI,
    handleStartTest,
  };
};

