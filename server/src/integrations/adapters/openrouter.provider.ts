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

const DEFAULT_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat',
  'meta-llama/llama-3.3-70b-instruct',
  'mistralai/mistral-large-2411',
  'qwen/qwen-2.5-coder-32b-instruct',
];

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
};

export class OpenRouterProvider implements AIProvider {
  readonly name = 'OpenRouter';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.ai.openrouter.apiKey;
    this.baseUrl = config.ai.openrouter.baseUrl || 'https://openrouter.ai/api/v1';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModels(): string[] {
    return DEFAULT_MODELS;
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
        models: DEFAULT_MODELS,
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
        models: DEFAULT_MODELS,
      };
    } catch (err) {
      return {
        name: this.name,
        enabled: true,
        healthy: false,
        latencyMs: Date.now() - startTime,
        models: DEFAULT_MODELS,
        error: (err as Error).message,
      };
    }
  }

  async generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string> {
    this.ensureKey();
    const model = options?.model || DEFAULT_MODELS[0];

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
            'HTTP-Referer': config.frontendUrl || 'https://nexus.ai',
            'X-Title': 'NEXUS AI Copilot',
            'Content-Type': 'application/json',
          },
          timeout: config.research.providerTimeoutMs,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenRouter returned empty response payload');
      }
      return content;
    } catch (err) {
      throw parseAIError(err, this.name, model);
    }
  }

  async generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T> {
    const raw = await this.generate(
      `${prompt}\n\nIMPORTANT: Respond with pure JSON ONLY. Do not include markdown or explanations.`,
      system,
      options
    );

    try {
      return JSON.parse(extractJson(raw)) as T;
    } catch (err) {
      logger.warn(`[OpenRouter] Returned malformed JSON`, { snippet: raw.slice(0, 200) });
      throw new AIProviderError({
        provider: this.name,
        model: options?.model || DEFAULT_MODELS[0],
        message: `OpenRouter returned invalid JSON: ${(err as Error).message}`,
        originalError: err,
      });
    }
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // OpenRouter embeddings support via openai/text-embedding-3-small or fallback vector generator
    this.ensureKey();
    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          model: 'openai/text-embedding-3-small',
          input: texts,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return response.data?.data?.map((item: { embedding: number[] }) => item.embedding) || texts.map(() => new Array(768).fill(0));
    } catch (err) {
      logger.warn('[OpenRouter] Embedding failed, fallback to zero vector', { error: (err as Error).message });
      return texts.map(() => new Array(768).fill(0));
    }
  }
}
