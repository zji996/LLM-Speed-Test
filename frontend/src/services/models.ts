import { ModelOption } from '../types';

export interface ModelService {
  fetchAvailableModels(endpoint: string, apiKey: string): Promise<ModelOption[]>;
  validateAPIKey(endpoint: string, apiKey: string): Promise<boolean>;
}

export class OpenAIModelService implements ModelService {
  async fetchAvailableModels(endpoint: string, apiKey: string): Promise<ModelOption[]> {
    try {
      const { GetAvailableModels } = await import('../wailsjs/go/main/App');
      const models = await GetAvailableModels(endpoint, apiKey);

      if (models && models.length > 0) {
        return models.map((model: string) => ({ id: model, name: model }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
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