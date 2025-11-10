import { useState, useEffect } from 'react';
import { ModelOption } from '../types';

export interface ModelSelectionState {
  models: ModelOption[];
  loading: boolean;
  error: string | null;
}

export const useModelSelection = () => {
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predefinedModels: ModelOption[] = [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' }
  ];

  const fetchModels = async (endpoint: string, apiKey: string) => {
    if (!apiKey) {
      setError('请输入API密钥');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { GetAvailableModels } = await import('../wailsjs/go/main/App');
      const models = await GetAvailableModels(endpoint, apiKey);

      if (models && models.length > 0) {
        // 优先使用从API获取的模型列表，确保只显示实际可用的模型
        const modelOptions = models.map((model: string) => ({ id: model, name: model }));
        setAvailableModels(modelOptions);
      } else {
        // 如果API没有返回模型列表，才使用预定义模型
        setError('未从API获取到模型列表，显示默认模型');
        setAvailableModels(predefinedModels);
      }
    } catch (err) {
      setError(`获取模型列表失败: ${err}`);
      // 获取失败时显示预定义模型作为回退
      setAvailableModels(predefinedModels);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    availableModels,
    isLoading,
    error,
    fetchModels
  };
};