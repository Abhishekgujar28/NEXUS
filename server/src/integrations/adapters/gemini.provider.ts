import { GoogleGenerativeAI } from '@google/generative-ai';
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

const GEN_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
const EMBED_MODELS = ['text-embedding-004', 'embedding-001'];

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.search(/[[{]/);
  if (firstBrace === -1) return text.trim();
  return text.slice(firstBrace).trim();
};

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  private client: GoogleGenerativeAI | null;

  constructor() {
    this.client = config.ai.gemini.apiKey || config.geminiApiKey
      ? new GoogleGenerativeAI(config.ai.gemini.apiKey || config.geminiApiKey)
      : null;
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  getModels(): string[] {
    return GEN_MODELS;
  }

  private ensure(): GoogleGenerativeAI {
    if (!this.client) throw new AIProviderNotConfiguredError(this.name);
    return this.client;
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isConfigured()) {
      return {
        name: this.name,
        enabled: false,
        healthy: false,
        latencyMs: 0,
        models: GEN_MODELS,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();
    try {
      const ai = this.ensure();
      const model = ai.getGenerativeModel({ model: GEN_MODELS[0] });
      await model.generateContent('ping');
      return {
        name: this.name,
        enabled: true,
        healthy: true,
        latencyMs: Date.now() - startTime,
        models: GEN_MODELS,
      };
    } catch (err) {
      return {
        name: this.name,
        enabled: true,
        healthy: false,
        latencyMs: Date.now() - startTime,
        models: GEN_MODELS,
        error: (err as Error).message,
      };
    }
  }

  private async executeWithModelFallback<T>(
    models: string[],
    operation: (modelName: string) => Promise<T>,
    maxRetriesPerModel = 2,
    baseDelayMs = 1000
  ): Promise<T> {
    let lastProviderError: AIProviderError | null = null;

    for (const modelName of models) {
      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        try {
          return await operation(modelName);
        } catch (rawErr) {
          const providerError = parseAIError(rawErr, this.name, modelName);
          lastProviderError = providerError;

          if (providerError.statusCode === 404 || providerError.message.includes('404 Not Found')) {
            logger.debug(`[${this.name}] Model [${modelName}] 404 Not Found. Switch candidate.`);
            break;
          }

          logger.warn(`[${this.name}] Failed attempt ${attempt}/${maxRetriesPerModel} on [${modelName}]`, {
            statusCode: providerError.statusCode,
            isQuotaError: providerError.isQuotaError,
            retryDelayMs: providerError.retryDelayMs,
            message: providerError.message,
          });

          if (attempt < maxRetriesPerModel) {
            const expDelay = baseDelayMs * Math.pow(2, attempt - 1);
            const backoffMs = providerError.retryDelayMs
              ? Math.max(providerError.retryDelayMs, expDelay)
              : expDelay;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
    }

    throw lastProviderError || new AIProviderError({
      provider: this.name,
      message: `All ${this.name} models failed to respond.`,
    });
  }

  async generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string> {
    const ai = this.ensure();
    const models = options?.model ? [options.model, ...GEN_MODELS] : GEN_MODELS;
    return this.executeWithModelFallback(models, async (modelName) => {
      const model = ai.getGenerativeModel({
        model: modelName,
        ...(system ? { systemInstruction: system } : {}),
      });
      const res = await model.generateContent(prompt);
      return res.response.text();
    });
  }

  async generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T> {
    const ai = this.ensure();
    const models = options?.model ? [options.model, ...GEN_MODELS] : GEN_MODELS;
    return this.executeWithModelFallback(models, async (modelName) => {
      const model = ai.getGenerativeModel({
        model: modelName,
        ...(system ? { systemInstruction: system } : {}),
      });
      const res = await model.generateContent(`${prompt}\n\nRespond with valid JSON only.`);
      const raw = res.response.text();
      try {
        return JSON.parse(extractJson(raw)) as T;
      } catch (err) {
        logger.warn(`[${this.name}] Malformed JSON from model [${modelName}]`, { snippet: raw.slice(0, 200) });
        throw err;
      }
    });
  }

  async embed(text: string): Promise<number[]> {
    const ai = this.ensure();
    return this.executeWithModelFallback(EMBED_MODELS, async (modelName) => {
      const model = ai.getGenerativeModel({ model: modelName });
      const res = await model.embedContent(text);
      return res.embedding.values;
    });
  }
}
