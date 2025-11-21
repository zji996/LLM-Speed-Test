import { useEffect, useState } from 'react';
import {
  PersistedAppConfig,
  PersistedTestState,
  SavedApiConfig,
  StepConfiguration,
  TestConfiguration,
  TestMode,
} from '../types';
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

const DEFAULT_SAVED_API_CONFIGS: SavedApiConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI 官方 (api.openai.com)',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    apiEndpoint: 'https://api.deepseek.com/v1',
    apiKey: '',
  },
];

// Heuristic guard: some early versions of the desktop
// config service could return an "empty" testState object
// (all numeric fields = 0, strings = ''), which would
// overwrite our intended defaults on first launch.
// Treat such shapes as "no persisted state" so that the
// UI falls back to proper defaults until a real config
// has been saved.
const isValidPersistedTestState = (state: PersistedTestState | undefined | null): state is PersistedTestState => {
  if (!state || !state.config) return false;

  const cfg = state.config as Partial<TestConfiguration>;

  // Consider the state valid only if at least one of the
  // key numeric fields has a sensible positive value.
  const hasPositiveNumbers =
    (typeof cfg.testCount === 'number' && cfg.testCount > 0) ||
    (typeof cfg.concurrentTests === 'number' && cfg.concurrentTests > 0) ||
    (typeof cfg.timeout === 'number' && cfg.timeout > 0);

  return !!hasPositiveNumbers;
};

export interface UseTestConfigurationResult {
  mode: TestMode;
  setMode: (mode: TestMode) => void;

  savedConfigs: SavedApiConfig[];
  saveCurrentConfig: (name: string) => void;
  deleteConfig: (id: string) => void;
  loadConfig: (id: string) => void;

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

  handleInputChange: <K extends keyof TestConfiguration>(field: K, value: TestConfiguration[K]) => void;
  handleValidateAPI: () => Promise<void>;
  handleStartTest: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
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

  const [savedConfigs, setSavedConfigs] = useState<SavedApiConfig[]>([]);

  // Load saved configs
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedApiConfigs');
      if (saved) {
        setSavedConfigs(JSON.parse(saved));
         return;
      }
    } catch (e) {
      console.warn('Failed to load saved API configs', e);
    }

    // Fallback: provide a couple of helpful defaults on first launch
    setSavedConfigs(DEFAULT_SAVED_API_CONFIGS);
  }, []);

  // Save configs to local storage
  useEffect(() => {
    try {
      localStorage.setItem('savedApiConfigs', JSON.stringify(savedConfigs));
    } catch (e) {
      console.warn('Failed to persist saved API configs', e);
    }
  }, [savedConfigs]);

  const saveCurrentConfig = (name: string) => {
    const newConfig: SavedApiConfig = {
      id: Date.now().toString(),
      name,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
    };
    setSavedConfigs(prev => [...prev, newConfig]);
  };

  const deleteConfig = (id: string) => {
    setSavedConfigs(prev => prev.filter(c => c.id !== id));
  };

  const loadConfig = (id: string) => {
    const target = savedConfigs.find(c => c.id === id);
    if (target) {
      setConfig(prev => ({
        ...prev,
        apiEndpoint: target.apiEndpoint,
        apiKey: target.apiKey
      }));
      localStorage.setItem('apiEndpoint', target.apiEndpoint);
      localStorage.setItem('apiKey', target.apiKey);
      // Optionally fetch models immediately if needed
      // fetchModels(target.apiEndpoint, target.apiKey); 
    }
  };

  // Load defaults from backend config file + localStorage
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const { GetDefaultTestConfiguration, GetAppConfig } = await import('../wailsjs/go/main/App');
        const defaultConfig = (await GetDefaultTestConfiguration()) as TestConfiguration;
        const persisted = (await GetAppConfig().catch(() => null)) as PersistedAppConfig | null;

        const savedEndpoint = localStorage.getItem('apiEndpoint');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedModel = localStorage.getItem('selectedModel');
        const savedStateRaw = localStorage.getItem('testConfigStateV1');
        const lastValidEndpoint =
          (persisted?.lastValidApiEndpoint && persisted.lastValidApiEndpoint.trim()) ||
          localStorage.getItem('lastValidApiEndpoint');
        const lastValidApiKey =
          (persisted?.lastValidApiKey && persisted.lastValidApiKey.trim()) ||
          localStorage.getItem('lastValidApiKey');

        let mergedConfig: TestConfiguration = {
          ...defaultConfig,
          apiEndpoint: defaultConfig.apiEndpoint,
          apiKey: defaultConfig.apiKey,
          model: '',
          promptType: 'fixed',
          prompt: '',
          testMode: 'normal',
          stepConfig: { start: 1, end: 10, step: 1 },
        };

        let restoredMode: TestMode = 'normal';

        // 1) Prefer UI-side state persisted in localStorage (latest edits)
        let usedState: PersistedTestState | undefined;

        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw) as PersistedTestState;
            if (savedState && savedState.config) {
              const {
                apiEndpoint: _ignoredSavedEndpoint,
                apiKey: _ignoredSavedApiKey,
                ...restSavedConfig
              } = savedState.config as TestConfiguration;

              mergedConfig = {
                ...mergedConfig,
                ...restSavedConfig,
              };
            }
            if (savedState && savedState.mode) {
              restoredMode = savedState.mode as TestMode;
            }
            if (savedState && savedState.concurrencyStepConfig) {
              setConcurrencyStepConfig(savedState.concurrencyStepConfig as StepConfiguration);
            }
            if (savedState && typeof savedState.concurrencyStepCount === 'number') {
              setConcurrencyStepCount(savedState.concurrencyStepCount as number);
            }
            if (savedState && savedState.inputStepConfig) {
              setInputStepConfig(savedState.inputStepConfig as StepConfiguration);
            }
            if (savedState && typeof savedState.inputStepCount === 'number') {
              setInputStepCount(savedState.inputStepCount as number);
            }
            usedState = savedState;
          } catch (e) {
            console.warn('Failed to restore saved test configuration state from localStorage:', e);
          }
        }

        // 2) Fallback: use persisted desktop config file state when there is no localStorage state
        if (!usedState) {
          const persistedState = isValidPersistedTestState(persisted?.testState) ? persisted!.testState : undefined;
          if (persistedState) {
            const {
              apiEndpoint: _ignoredPersistedEndpoint,
              apiKey: _ignoredPersistedApiKey,
              ...restPersistedConfig
            } = persistedState.config as TestConfiguration;

            mergedConfig = {
              ...mergedConfig,
              ...restPersistedConfig,
            };
            restoredMode = persistedState.mode;
            setConcurrencyStepConfig(persistedState.concurrencyStepConfig);
            setConcurrencyStepCount(persistedState.concurrencyStepCount);
            setInputStepConfig(persistedState.inputStepConfig);
            setInputStepCount(persistedState.inputStepCount);
          }
        }

        // Decide which API endpoint/key to use, independent of the test
        // configuration so that defaults and API state can evolve separately.
        const effectiveEndpoint =
          lastValidEndpoint || savedEndpoint || mergedConfig.apiEndpoint || defaultConfig.apiEndpoint;
        const effectiveApiKey =
          lastValidApiKey || savedApiKey || mergedConfig.apiKey || defaultConfig.apiKey;

        mergedConfig = {
          ...mergedConfig,
          apiEndpoint: effectiveEndpoint,
          apiKey: effectiveApiKey,
          model: savedModel || mergedConfig.model || '',
          promptType: 'fixed',
          prompt: '',
          testMode: 'normal',
        };

        // Load saved API configs from file if present
        if (persisted?.savedApiConfigs && persisted.savedApiConfigs.length > 0) {
          setSavedConfigs(persisted.savedApiConfigs);
        }

        setConfig(mergedConfig);
        setMode(restoredMode);

        if (mergedConfig.apiEndpoint && mergedConfig.apiKey) {
          fetchModels(mergedConfig.apiEndpoint, mergedConfig.apiKey);
        }
      } catch (err) {
        console.error('Failed to load defaults:', err);
      }
    };

    loadDefaults();
  }, [fetchModels]);

  // Persist configuration and step settings to both localStorage and backend config file
  useEffect(() => {
    try {
      const stateToSave: PersistedTestState = {
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

  // Helper: persist full app config file, called only after
  // a successful API validation to avoid saving incomplete states.
  const persistAppConfig = async (lastValidEndpoint?: string, lastValidApiKey?: string) => {
    try {
      const { SaveAppConfig } = await import('../wailsjs/go/main/App');

      const stateToSave: PersistedTestState = {
        config,
        mode,
        concurrencyStepConfig,
        concurrencyStepCount,
        inputStepConfig,
        inputStepCount,
      };

      const appConfig: PersistedAppConfig = {
        testState: stateToSave,
        savedApiConfigs: savedConfigs,
        lastValidApiEndpoint:
          lastValidEndpoint ?? localStorage.getItem('lastValidApiEndpoint') ?? '',
        lastValidApiKey: lastValidApiKey ?? localStorage.getItem('lastValidApiKey') ?? '',
      };

      await SaveAppConfig(appConfig);
    } catch (err) {
      console.warn('Failed to persist app config file:', err);
    }
  };

  const handleInputChange = <K extends keyof TestConfiguration>(field: K, value: TestConfiguration[K]) => {
    setConfig(prev => {
      const next: TestConfiguration = { ...prev, [field]: value };
      if (field === 'apiEndpoint') localStorage.setItem('apiEndpoint', String(value));
      if (field === 'apiKey') localStorage.setItem('apiKey', String(value));
      if (field === 'model') {
        if (value) localStorage.setItem('selectedModel', String(value));
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
      // Persist the last successfully validated endpoint & key
      // so that a fresh launch can start from a known-good API.
      try {
        localStorage.setItem('lastValidApiEndpoint', config.apiEndpoint);
        localStorage.setItem('lastValidApiKey', config.apiKey);
        // Also persist the full app config file only after a
        // successful validation + model fetch.
        await persistAppConfig(config.apiEndpoint, config.apiKey);
      } catch (e) {
        console.warn('Failed to persist last valid API config', e);
      }
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

  const resetToDefaults = async () => {
    try {
      const { GetDefaultTestConfiguration } = await import('../wailsjs/go/main/App');
      const defaultConfig = (await GetDefaultTestConfiguration()) as TestConfiguration;

      const currentEndpoint = config.apiEndpoint;
      const currentApiKey = config.apiKey;

      const nextConfig: TestConfiguration = {
        ...defaultConfig,
        apiEndpoint: currentEndpoint,
        apiKey: currentApiKey,
        model: '',
        promptType: 'fixed',
        prompt: '',
        testMode: 'normal',
        stepConfig: { start: 1, end: 10, step: 1 },
        headers: {},
      };

      setConfig(nextConfig);
      setMode('normal');
      setConcurrencyStepConfig({ start: 1, end: 10, step: 1 });
      setConcurrencyStepCount(10);
      setInputStepConfig({ start: 2048, end: 2048 * 3, step: 2048 });
      setInputStepCount(3);
      setCustomHeaders('');
      setValidationError('');
    } catch (err) {
      console.error('Failed to reset configuration to defaults:', err);
    }
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
    savedConfigs,
    saveCurrentConfig,
    deleteConfig,
    loadConfig,
    availableModels,
    isLoadingModels: isLoading,
    modelError: error,
    modelOptions,
    promptLengthOptions,
    handleInputChange,
    handleValidateAPI,
    handleStartTest,
    resetToDefaults,
  };
};
