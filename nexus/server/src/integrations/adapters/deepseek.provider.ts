import axios from 'axios';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import {
  AIProvider,
  AIProviderNotConfiguredError,
  AIProviderError,
  ProviderHealthStatus,
  AIGenerateOptions,
} from '../AIProvider.js';
import { parseAIError } from '../parseAIError.js';

const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-coder'];

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
};

export class DeepSeekProvider implements AIProvider {
  readonly name = 'DeepSeek';
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = config.ai.deepseek.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModels(): string[] {
    return DEEPSEEK_MODELS;
  }

  private ensureKey(): void {
    if (!this.isConfigured()) {
      throw new AIProviderNotConfiguredError(this.name);
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isConfigured()) {
      return {
        name: this.name,
        enabled: false,
        healthy: false,
        latencyMs: 0,
        models: DEEPSEEK_MODELS,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();
    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });
      return {
        name: this.name,
        enabled: true,
        healthy: true,
        latencyMs: Date.now() - startTime,
        models: DEEPSEEK_MODELS,
      };
    } catch (err) {
      return {
        name: this.name,
        enabled: true,
        healthy: false,
        latencyMs: Date.now() - startTime,
        models: DEEPSEEK_MODELS,
        error: (err as Error).message,
      };
    }
  }

  async generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string> {
    this.ensureKey();
    const model = options?.model || DEEPSEEK_MODELS[0];

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.research.providerTimeoutMs,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('DeepSeek returned empty response payload');
      return content;
    } catch (err) {
      throw parseAIError(err, this.name, model);
    }
  }

  async generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T> {
    const raw = await this.generate(
      `${prompt}\n\nIMPORTANT: Respond with pure JSON ONLY. Do not include markdown formatting or prose.`,
      system,
      options
    );

    try {
      return JSON.parse(extractJson(raw)) as T;
    } catch (err) {
      logger.warn(`[DeepSeek] Returned malformed JSON`, { snippet: raw.slice(0, 200) });
      throw new AIProviderError({
        provider: this.name,
        model: options?.model || DEEPSEEK_MODELS[0],
        message: `DeepSeek returned invalid JSON: ${(err as Error).message}`,
        originalError: err,
      });
    }
  }

  async embed(text: string): Promise<number[]> {
    logger.warn('[DeepSeek] Embeddings not natively supported by DeepSeek, returning fallback vector');
    return new Array(768).fill(0);
  }
}
