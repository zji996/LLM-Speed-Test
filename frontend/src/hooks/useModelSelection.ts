import { useState, useCallback } from 'react';
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

  const fetchModels = useCallback(async (endpoint: string, apiKey: string) => {
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
        const modelOptions = models.map((model: string) => ({ id: model, name: model }));
        setAvailableModels(modelOptions);
      } else {
        setError('未从API获取到模型列表');
        setAvailableModels([]);
      }
    } catch (err) {
      setError(`获取模型列表失败: ${err}`);
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    availableModels,
    isLoading,
    error,
    fetchModels
  };
};
