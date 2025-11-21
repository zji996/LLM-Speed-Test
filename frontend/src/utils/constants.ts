export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1',
  AZURE: 'https://{resource}.openai.azure.com/openai/deployments',
  CUSTOM: ''
};

export const DEFAULT_CONFIG = {
  apiEndpoint: API_ENDPOINTS.OPENAI,
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
  testCount: 2,
  concurrentTests: 3,
  timeout: 60
};

export const PROMPT_LENGTHS = [128, 256, 512, 1024, 2048];

export const MAX_LIVE_CHART_POINTS = 50;

export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV 表格' },
  { value: 'json', label: 'JSON 数据' },
  { value: 'png', label: '图表图片' }
];

export const CHART_COLORS = {
  latency: '#3b82f6',
  throughput: '#10b981',
  tokens: '#f59e0b',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4'
};

export const NAVIGATION_ITEMS = [
  {
    id: 'configuration',
    label: '测试配置',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  },
  {
    id: 'results',
    label: '测试结果',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  {
    id: 'charts',
    label: '性能图表',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
  }
];
