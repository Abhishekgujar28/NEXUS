import { logger } from '../core/logger.js';

export interface FallbackStrategy {
  providerName: string;
  fallbackProviderName: string;
}

export const AI_FALLBACK_MAP: Record<string, string> = {
  openai: 'anthropic',
  anthropic: 'gemini',
  gemini: 'openrouter',
  deepseek: 'anthropic',
  groq: 'openai',
  openrouter: 'gemini',
  together: 'openai',
};

export const getFallbackProvider = (providerName: string): string => {
  const fallback = AI_FALLBACK_MAP[providerName.toLowerCase()] || 'openai';
  logger.info(`Fallback strategy resolved: ${providerName} -> ${fallback}`);
  return fallback;
};
