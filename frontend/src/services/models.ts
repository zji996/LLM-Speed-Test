import { ModelOption } from '../types';

export interface ModelService {
  fetchAvailableModels(endpoint: string, apiKey: string): Promise<ModelOption[]>;
  validateAPIKey(endpoint: string, apiKey: string): Promise<boolean>;
}

export class OpenAIModelService implements ModelService {
  private predefinedModels: ModelOption[] = [
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' }
  ];

  async fetchAvailableModels(endpoint: string, apiKey: string): Promise<ModelOption[]> {
    try {
      const { GetAvailableModels } = await import('../wailsjs/go/main/App');
      const models = await GetAvailableModels(endpoint, apiKey);

      if (models && models.length > 0) {
        const modelOptions = models.map((model: string) => ({ id: model, name: model }));
        return [
          ...this.predefinedModels,
          ...modelOptions.filter((m: ModelOption) =>
            !this.predefinedModels.some((pm: ModelOption) => pm.id === m.id)
          )
        ];
      }
      return this.predefinedModels;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return this.predefinedModels;
    }
  }

  async validateAPIKey(endpoint: string, apiKey: string): Promise<boolean> {
    try {
      const { ValidateAPIKey } = await import('../wailsjs/go/main/App');
      await ValidateAPIKey(endpoint, apiKey);
      return true;
    } catch (error) {
      console.error('API validation failed:', error);
      return false;
    }
  }
}

export const modelService = new OpenAIModelService();