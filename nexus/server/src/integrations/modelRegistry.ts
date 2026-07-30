export interface TaskModelConfig {
  primaryProvider: string;
  primaryModel?: string;
  fallbackProviders: string[];
}

export const TASK_MODEL_REGISTRY: Record<string, TaskModelConfig> = {
  research: {
    primaryProvider: 'openrouter',
    primaryModel: 'openai/gpt-4o-mini',
    fallbackProviders: ['gemini', 'anthropic', 'openai'],
  },
  copilot: {
    primaryProvider: 'anthropic',
    primaryModel: 'claude-3-5-sonnet-20241022',
    fallbackProviders: ['openrouter', 'openai', 'gemini'],
  },
  architecture: {
    primaryProvider: 'openai',
    primaryModel: 'gpt-4o',
    fallbackProviders: ['anthropic', 'openrouter', 'gemini'],
  },
  summarization: {
    primaryProvider: 'gemini',
    primaryModel: 'gemini-2.0-flash',
    fallbackProviders: ['groq', 'openrouter'],
  },
  fast_classification: {
    primaryProvider: 'groq',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackProviders: ['gemini', 'openrouter'],
  },
  default: {
    primaryProvider: 'openrouter',
    primaryModel: 'openai/gpt-4o-mini',
    fallbackProviders: ['gemini', 'anthropic', 'openai', 'groq', 'deepseek', 'together'],
  },
};

/**
 * Helper to get provider priority chain for a specific task category.
 */
export const getProviderChainForTask = (taskCategory?: string, defaultPrimary = 'openrouter'): string[] => {
  const config = (taskCategory && TASK_MODEL_REGISTRY[taskCategory]) || TASK_MODEL_REGISTRY.default;
  const primary = config.primaryProvider || defaultPrimary;
  const chain = [primary, ...config.fallbackProviders];
  // Remove duplicates while preserving order
  return Array.from(new Set(chain));
};
