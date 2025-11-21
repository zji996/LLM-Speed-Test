import React, { useState, useEffect } from 'react';
import { TestConfiguration, StepConfiguration, TestMode } from '../../types';
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
  const [mode, setMode] = useState<TestMode>('normal');

  // Separate step configs for different modes so that
  // switching tabs does not leak values between modes.
  const [concurrencyStepConfig, setConcurrencyStepConfig] = useState<StepConfiguration>({
    start: 1,
    end: 10,
    step: 1
  });
  const [concurrencyStepCount, setConcurrencyStepCount] = useState<number>(10);

  // Input-length step defaults: start at 2048 tokens,
  // step by 2048 tokens. The end value will be derived
  // from start + step * (count - 1) when starting tests.
  const [inputStepConfig, setInputStepConfig] = useState<StepConfiguration>({
    start: 2048,
    end: 2048 * 3,
    step: 2048
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
    headers: {}
  });

  const { availableModels, isLoading, error, fetchModels } = useModelSelection();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<string>('');

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const { GetDefaultTestConfiguration } = await import('../../../wailsjs/go/main/App');
        const defaultConfig = await GetDefaultTestConfiguration() as TestConfiguration;
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
          stepConfig: { start: 1, end: 10, step: 1 }
        };

        let restoredMode: TestMode = 'normal';

        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw);
            if (savedState.config) {
              mergedConfig = {
                ...mergedConfig,
                ...savedState.config
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

        // Ensure fixed prompt settings regardless of saved state
        mergedConfig = {
          ...mergedConfig,
          promptType: 'fixed',
          prompt: '',
          testMode: 'normal'
        };

        setConfig(mergedConfig);
        setMode(restoredMode);

        if (savedApiKey && savedEndpoint) {
          fetchModels(savedEndpoint, savedApiKey);
        }
      } catch (error) {
        console.error('Failed to load defaults:', error);
      }
    };

    loadDefaults();
  }, []);

  // Persist configuration and step settings so they survive
  // component remounts (e.g., when navigating to results tab).
  useEffect(() => {
    try {
      const stateToSave = {
        config,
        mode,
        concurrencyStepConfig,
        concurrencyStepCount,
        inputStepConfig,
        inputStepCount
      };
      localStorage.setItem('testConfigStateV1', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to persist test configuration state:', error);
    }
  }, [config, mode, concurrencyStepConfig, concurrencyStepCount, inputStepConfig, inputStepCount]);

  const handleInputChange = (field: keyof TestConfiguration, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      if (field === 'apiEndpoint') localStorage.setItem('apiEndpoint', value);
      if (field === 'apiKey') localStorage.setItem('apiKey', value);
      if (field === 'model') {
        if (value) localStorage.setItem('selectedModel', value);
        else localStorage.removeItem('selectedModel');
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
    if (!config.apiKey) return setValidationError('请输入API密钥');
    if (!config.model) return setValidationError('请选择模型');
    
    const isModelValid = availableModels.some(m => m.id === config.model);
    if (!isModelValid) return setValidationError(`选择的模型 "${config.model}" 不在可用模型列表中，请先验证API`);

    if (config.testCount < 1 || config.testCount > MAX_TEST_ROUNDS) {
      return setValidationError(`测试轮次必须在1-${MAX_TEST_ROUNDS}之间`);
    }

    try {
      const { ValidatePromptConfig } = await import('../../../wailsjs/go/main/App');
      await ValidatePromptConfig(config.promptType, config.promptLength);
    } catch (error) {
      return setValidationError(`提示词配置错误: ${error}`);
    }

    let headers = {};
    if (customHeaders.trim()) {
      try {
        headers = JSON.parse(customHeaders);
      } catch (error) {
        return setValidationError('自定义请求头格式错误');
      }
    }

    // Derive active step config based on mode so that
    // concurrency step and input length step can have
    // independent ranges and defaults.
    let activeStepConfig: StepConfiguration = config.stepConfig;

    if (mode === 'concurrency_step') {
      const safeCount = Math.max(1, concurrencyStepCount || 1);
      const safeStart = concurrencyStepConfig.start > 0 ? concurrencyStepConfig.start : 1;
      const safeStep = concurrencyStepConfig.step > 0 ? concurrencyStepConfig.step : 1;
      const derivedEnd = safeStart + safeStep * (safeCount - 1);
      activeStepConfig = {
        start: safeStart,
        end: derivedEnd,
        step: safeStep
      };
    } else if (mode === 'input_step') {
      const safeCount = Math.max(1, inputStepCount || 1);
      const safeStart = inputStepConfig.start > 0 ? inputStepConfig.start : 2048;
      const safeStep = inputStepConfig.step > 0 ? inputStepConfig.step : 2048;
      const derivedEnd = safeStart + safeStep * (safeCount - 1);
      activeStepConfig = {
        start: safeStart,
        end: derivedEnd,
        step: safeStep
      };
    }

    // Validate Step Config
    if (mode !== 'normal') {
      if (activeStepConfig.start <= 0 || activeStepConfig.end < activeStepConfig.start || activeStepConfig.step <= 0) {
        return setValidationError('步进配置无效: 请检查起始值、结束值和步长');
      }
    }

    const finalConfig: TestConfiguration = {
      ...config,
      testMode: mode,
      stepConfig: activeStepConfig,
      promptType: 'fixed',
      prompt: '',
      headers
    };

    onStartTest(finalConfig);
  };

  const modelOptions = availableModels.map(model => ({ value: model.id, label: model.name }));
  const promptLengthOptions = PROMPT_LENGTHS.map(length => ({ value: length.toString(), label: `${length} tokens` }));

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white neon-text">LLM 性能极限测试</h1>
        <p className="text-gray-400">配置参数，探索大模型的推理速度边界</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: API & Model (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card 
            header={
              <div className="flex items-center text-[var(--color-primary)] font-semibold">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                API 连接配置
              </div>
            }
          >
            <div className="space-y-5">
              <Input
                label="API 端点 (Base URL)"
                value={config.apiEndpoint}
                onChange={(value) => handleInputChange('apiEndpoint', value)}
                placeholder="https://api.openai.com/v1"
                disabled={isRunning}
              />
              <Input
                label="API 密钥 (API Key)"
                type="password"
                value={config.apiKey}
                onChange={(value) => handleInputChange('apiKey', value)}
                placeholder="sk-..."
                disabled={isRunning}
                required
              />
              <div className="flex gap-3 pt-2">
                 <Button 
                   onClick={handleValidateAPI} 
                   loading={isValidating} 
                   disabled={isValidating || isRunning}
                   className="flex-1"
                 >
                   验证连接 & 获取模型
                 </Button>
                 <Button 
                   variant="secondary"
                   onClick={() => {
                     localStorage.removeItem('apiEndpoint');
                     localStorage.removeItem('apiKey');
                     setConfig(p => ({ ...p, apiEndpoint: 'https://api.openai.com/v1', apiKey: '' }));
                   }}
                   disabled={isRunning}
                 >
                   重置
                 </Button>
              </div>
            </div>
          </Card>

          <Card
             header={
              <div className="flex items-center text-[var(--color-secondary)] font-semibold">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                模型参数设置
              </div>
            }
          >
            <div className="space-y-5">
              <Select
                label="选择模型"
                value={config.model}
                onChange={(value) => handleInputChange('model', value)}
                options={modelOptions}
                disabled={isRunning}
                required
                placeholder={availableModels.length === 0 ? "请先验证 API..." : "请选择模型..."}
              />
              <Select
                label="输入长度 (Prompt Tokens)"
                value={config.promptLength.toString()}
                onChange={(value) => handleInputChange('promptLength', parseInt(value))}
                options={promptLengthOptions}
                disabled={isRunning || mode === 'input_step'}
              />
              <Input
                label="最大输出长度 (Max Output Tokens)"
                type="number"
                value={config.maxTokens}
                onChange={(value) => handleInputChange('maxTokens', parseInt(value))}
                disabled={isRunning}
                min={1}
                max={4096}
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Test Strategy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center text-[var(--color-accent)] font-semibold">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  测试模式
                </div>
              </div>
            }
          >
             <div className="space-y-6">
               <div className="grid grid-cols-3 gap-2">
                   <button
                     onClick={() => setMode('normal')}
                     className={`px-3 py-2 text-sm rounded-md transition-all border ${mode === 'normal' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                   >
                     普通测试
                   </button>
                   <button
                     onClick={() => setMode('concurrency_step')}
                     className={`px-3 py-2 text-sm rounded-md transition-all border ${mode === 'concurrency_step' ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                   >
                     并发步进测试
                   </button>
                   <button
                     onClick={() => setMode('input_step')}
                     className={`px-3 py-2 text-sm rounded-md transition-all border ${mode === 'input_step' ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                   >
                     输入长度步进
                   </button>
               </div>

               {mode === 'normal' && (
                 <div className="space-y-3 animate-fade-in">
                    <Input
                      label="并发数 (Concurrency)"
                      type="number"
                      value={config.concurrentTests}
                      onChange={(value) => handleInputChange('concurrentTests', parseInt(value))}
                      disabled={isRunning}
                      min={1}
                      max={MAX_CONCURRENT_TESTS}
                      helperText="同时发起的请求数量"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[1, 5, 10, 20, 50].map(num => (
                        <button
                          key={num}
                          onClick={() => handleInputChange('concurrentTests', num)}
                          className={`px-2 py-1 text-xs rounded border border-white/10 hover:border-[var(--color-primary)] transition-colors ${config.concurrentTests === num ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-gray-400'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                 </div>
               )}

               {mode === 'concurrency_step' && (
                 <div className="space-y-4 animate-fade-in bg-white/5 rounded-lg p-4 border border-white/10">
                   <h3 className="text-sm font-semibold text-gray-200 mb-2">
                     并发数范围设置
                   </h3>
                   <div className="grid grid-cols-3 gap-3">
                     <Input
                       label="起始值 (Start)"
                       type="number"
                       value={concurrencyStepConfig.start}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const start = Number.isNaN(parsed) ? 1 : parsed;
                         setConcurrencyStepConfig(prev => {
                           const safeStep = prev.step > 0 ? prev.step : 1;
                           const count = Math.max(1, concurrencyStepCount || 1);
                           const end = start + safeStep * (count - 1);
                           return { ...prev, start, end };
                         });
                       }}
                     />
                     <Input
                       label="步长 (Step)"
                       type="number"
                       value={concurrencyStepConfig.step}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const step = parsed > 0 ? parsed : 1;
                         setConcurrencyStepConfig(prev => {
                           const safeStart = prev.start > 0 ? prev.start : 1;
                           const count = Math.max(1, concurrencyStepCount || 1);
                           const end = safeStart + step * (count - 1);
                           return { ...prev, step, end };
                         });
                       }}
                     />
                     <Input
                       label="次数 (Count)"
                       type="number"
                       value={concurrencyStepCount}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const count = Math.max(1, parsed || 1);
                         setConcurrencyStepCount(count);
                         setConcurrencyStepConfig(prev => {
                           const safeStart = prev.start > 0 ? prev.start : 1;
                           const safeStep = prev.step > 0 ? prev.step : 1;
                           const end = safeStart + safeStep * (count - 1);
                           return { ...prev, end };
                         });
                       }}
                     />
                   </div>
                   <div className="text-xs text-gray-400 mt-1">
                     预计结束值 (End): {concurrencyStepConfig.end}
                   </div>
                 </div>
               )}

               {mode === 'input_step' && (
                 <div className="space-y-4 animate-fade-in bg-white/5 rounded-lg p-4 border border-white/10">
                   <h3 className="text-sm font-semibold text-gray-200 mb-2">
                     输入长度范围设置 (Tokens)
                   </h3>
                   <div className="grid grid-cols-3 gap-3">
                     <Input
                       label="起始值 (Start)"
                       type="number"
                       value={inputStepConfig.start}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const start = Number.isNaN(parsed) ? 2048 : parsed;
                         setInputStepConfig(prev => {
                           const safeStep = prev.step > 0 ? prev.step : 2048;
                           const count = Math.max(1, inputStepCount || 1);
                           const end = start + safeStep * (count - 1);
                           return { ...prev, start, end };
                         });
                       }}
                     />
                     <Input
                       label="步长 (Step)"
                       type="number"
                       value={inputStepConfig.step}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const step = parsed > 0 ? parsed : 2048;
                         setInputStepConfig(prev => {
                           const safeStart = prev.start > 0 ? prev.start : 2048;
                           const count = Math.max(1, inputStepCount || 1);
                           const end = safeStart + step * (count - 1);
                           return { ...prev, step, end };
                         });
                       }}
                     />
                     <Input
                       label="次数 (Count)"
                       type="number"
                       value={inputStepCount}
                       onChange={v => {
                         const parsed = parseInt(v);
                         const count = Math.max(1, parsed || 1);
                         setInputStepCount(count);
                         setInputStepConfig(prev => {
                           const safeStart = prev.start > 0 ? prev.start : 2048;
                           const safeStep = prev.step > 0 ? prev.step : 2048;
                           const end = safeStart + safeStep * (count - 1);
                           return { ...prev, end };
                         });
                       }}
                     />
                   </div>
                   <div className="text-xs text-gray-400 mt-1">
                     预计结束值 (End): {inputStepConfig.end}
                   </div>
                   <div className="pt-2">
                     <Input
                       label="固定并发数"
                       type="number"
                       value={config.concurrentTests}
                       onChange={value => handleInputChange('concurrentTests', parseInt(value))}
                       disabled={isRunning}
                       min={1}
                     />
                   </div>
                 </div>
               )}
               
               {/* Advanced Toggle */}
               <div>
                 <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                 >
                    <svg className={`w-4 h-4 mr-2 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    高级参数设置 (Temperature, Top P, etc.)
                 </button>
                 
                 {showAdvanced && (
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up p-4 bg-black/20 rounded-lg">
                      <Input
                        label="测试轮次 (Rounds per step)"
                        type="number"
                        value={config.testCount}
                        onChange={(value) => handleInputChange('testCount', parseInt(value))}
                        disabled={isRunning}
                        min={1}
                        max={MAX_TEST_ROUNDS}
                        helperText="每个配置重复执行的轮次，用于平滑波动 (默认 2 次)"
                      />
                      <Input label="Temperature" type="number" value={config.temperature} onChange={v => handleInputChange('temperature', parseFloat(v))} step={0.1} min={0} max={2} />
                      <Input label="Top P" type="number" value={config.topP} onChange={v => handleInputChange('topP', parseFloat(v))} step={0.1} min={0} max={1} />
                      <Input label="超时 (秒)" type="number" value={config.timeout} onChange={v => handleInputChange('timeout', parseInt(v))} />
                      <Input label="Frequency Penalty" type="number" value={config.frequencyPenalty} onChange={v => handleInputChange('frequencyPenalty', parseFloat(v))} step={0.1} />
                   </div>
                 )}
               </div>
             </div>
          </Card>

          {validationError && (
            <div className="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] flex items-center animate-bounce">
               <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {validationError}
            </div>
          )}

          <Button
             onClick={handleStartTest}
             disabled={isRunning}
             loading={isRunning}
             size="lg"
             className="w-full text-lg font-bold tracking-wide uppercase py-4"
          >
             {isRunning ? '测试运行中...' : '启动性能测试'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestConfigurationComponent;
