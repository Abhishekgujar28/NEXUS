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

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
];

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
};

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor() {
    this.apiKey = config.ai.anthropic.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModels(): string[] {
    return ANTHROPIC_MODELS;
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
        models: ANTHROPIC_MODELS,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();
    try {
      await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: ANTHROPIC_MODELS[1],
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 5000,
        }
      );
      return {
        name: this.name,
        enabled: true,
        healthy: true,
        latencyMs: Date.now() - startTime,
        models: ANTHROPIC_MODELS,
      };
    } catch (err) {
      return {
        name: this.name,
        enabled: true,
        healthy: false,
        latencyMs: Date.now() - startTime,
        models: ANTHROPIC_MODELS,
        error: (err as Error).message,
      };
    }
  }

  async generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string> {
    this.ensureKey();
    const model = options?.model || ANTHROPIC_MODELS[0];

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model,
          max_tokens: options?.maxTokens ?? 4000,
          temperature: options?.temperature ?? 0.7,
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: config.research.providerTimeoutMs,
        }
      );

      const content = response.data?.content?.[0]?.text;
      if (!content) throw new Error('Anthropic returned empty message response');
      return content;
    } catch (err) {
      throw parseAIError(err, this.name, model);
    }
  }

  async generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T> {
    const raw = await this.generate(
      `${prompt}\n\nIMPORTANT: Respond with valid JSON ONLY. No outer text or markdown wrapper.`,
      system,
      options
    );

    try {
      return JSON.parse(extractJson(raw)) as T;
    } catch (err) {
      logger.warn(`[Anthropic] Returned malformed JSON`, { snippet: raw.slice(0, 200) });
      throw new AIProviderError({
        provider: this.name,
        model: options?.model || ANTHROPIC_MODELS[0],
        message: `Anthropic returned invalid JSON: ${(err as Error).message}`,
        originalError: err,
      });
    }
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic does not provide native embeddings; return 768 fallback vector or throw
    logger.warn('[Anthropic] Embeddings not natively supported by Anthropic, using fallback vector');
    return new Array(768).fill(0);
  }
}
