import React, { useState, useEffect } from 'react';
import { TestConfiguration, ModelOption } from '../../types';
import { useModelSelection } from '../../hooks';
import { Button, Card, Input, Select } from '../common';
import { PROMPT_LENGTHS } from '../../utils';

const MAX_TEST_ROUNDS = 100;
const MAX_CONCURRENT_TESTS = 50;

interface TestConfigurationProps {
  onStartTest: (config: TestConfiguration | TestConfiguration[]) => void;
  isRunning: boolean;
}

const TestConfigurationComponent: React.FC<TestConfigurationProps> = ({ onStartTest, isRunning }) => {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [autoModeType, setAutoModeType] = useState<'list' | 'range'>('range');
  
  const [autoSteps, setAutoSteps] = useState({
    start: 1,
    end: 10,
    step: 1,
    customList: '1, 5, 10, 20'
  });

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
    const loadDefaults = async () => {
      try {
        const { GetDefaultTestConfiguration } = await import('../../../wailsjs/go/main/App');
        const defaultConfig = await GetDefaultTestConfiguration();
        const savedEndpoint = localStorage.getItem('apiEndpoint');
        const savedApiKey = localStorage.getItem('apiKey');
        const savedModel = localStorage.getItem('selectedModel');

        const mergedConfig = {
          ...defaultConfig,
          apiEndpoint: savedEndpoint || defaultConfig.apiEndpoint,
          apiKey: savedApiKey || defaultConfig.apiKey,
          model: savedModel || '',
          promptType: 'fixed',
          prompt: ''
        };

        setConfig(mergedConfig);

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

    const baseConfig = { ...config, promptType: 'fixed', prompt: '', headers };

    if (mode === 'manual') {
      if (config.concurrentTests < 1 || config.concurrentTests > MAX_CONCURRENT_TESTS) {
        return setValidationError(`并发数必须在1-${MAX_CONCURRENT_TESTS}之间`);
      }
      onStartTest(baseConfig);
    } else {
      let steps: number[] = [];
      if (autoModeType === 'list') {
        steps = autoSteps.customList.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= MAX_CONCURRENT_TESTS).sort((a, b) => a - b);
      } else {
        const { start, end, step } = autoSteps;
        if (start > end) return setValidationError('起始并发数不能大于结束并发数');
        if (step < 1) return setValidationError('步进值必须大于0');
        for (let i = start; i <= end; i += step) {
          if (i <= MAX_CONCURRENT_TESTS) steps.push(i);
        }
      }

      const uniqueSteps = Array.from(new Set(steps));
      if (uniqueSteps.length === 0) return setValidationError('生成的并发数列表为空');

      const configs = uniqueSteps.map(concurrency => ({
        ...baseConfig,
        concurrentTests: concurrency
      }));
      onStartTest(configs);
    }
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
                API 连接
              </div>
            }
          >
            <div className="space-y-5">
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
                   验证连接
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
                   清除
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
                模型参数
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
                label="提示词长度"
                value={config.promptLength.toString()}
                onChange={(value) => handleInputChange('promptLength', parseInt(value))}
                options={promptLengthOptions}
                disabled={isRunning}
              />
              <Input
                label="最大输出 (Max Tokens)"
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
                  测试策略
                </div>
                <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                   <button
                     onClick={() => setMode('manual')}
                     className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'manual' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                   >
                     单次测试
                   </button>
                   <button
                     onClick={() => setMode('auto')}
                     className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'auto' ? 'bg-[var(--color-accent)] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                   >
                     自动步进
                   </button>
                </div>
              </div>
            }
          >
             <div className="space-y-6">
               <Input
                  label="每轮请求次数 (Batch Size)"
                  type="number"
                  value={config.testCount}
                  onChange={(value) => handleInputChange('testCount', parseInt(value))}
                  disabled={isRunning}
                  min={1}
                  max={MAX_TEST_ROUNDS}
                  placeholder="例如: 10"
                />

               {mode === 'manual' ? (
                 <div className="space-y-3 animate-fade-in">
                    <Input
                      label="并发数 (Concurrency)"
                      type="number"
                      value={config.concurrentTests}
                      onChange={(value) => handleInputChange('concurrentTests', parseInt(value))}
                      disabled={isRunning}
                      min={1}
                      max={MAX_CONCURRENT_TESTS}
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
               ) : (
                 <div className="space-y-4 animate-fade-in bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex space-x-4 mb-2 border-b border-white/10 pb-2">
                       <label className="flex items-center cursor-pointer">
                         <input type="radio" checked={autoModeType === 'range'} onChange={() => setAutoModeType('range')} className="accent-[var(--color-accent)]" />
                         <span className="ml-2 text-sm text-gray-300">范围扫描 (Start-End)</span>
                       </label>
                       <label className="flex items-center cursor-pointer">
                         <input type="radio" checked={autoModeType === 'list'} onChange={() => setAutoModeType('list')} className="accent-[var(--color-accent)]" />
                         <span className="ml-2 text-sm text-gray-300">自定义列表</span>
                       </label>
                    </div>

                    {autoModeType === 'range' ? (
                      <div className="grid grid-cols-3 gap-3">
                        <Input label="起始" type="number" value={autoSteps.start} onChange={v => setAutoSteps(p => ({...p, start: parseInt(v)||1}))} />
                        <Input label="结束" type="number" value={autoSteps.end} onChange={v => setAutoSteps(p => ({...p, end: parseInt(v)||10}))} />
                        <Input label="步长" type="number" value={autoSteps.step} onChange={v => setAutoSteps(p => ({...p, step: parseInt(v)||1}))} />
                      </div>
                    ) : (
                      <Input label="并发列表 (逗号分隔)" value={autoSteps.customList} onChange={v => setAutoSteps(p => ({...p, customList: v}))} />
                    )}
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
                    高级参数设置
                 </button>
                 
                 {showAdvanced && (
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up p-4 bg-black/20 rounded-lg">
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
