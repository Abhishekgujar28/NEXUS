import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import AIUsageLog from '../models/AIUsageLog.js';
import {
  AIProvider,
  AIProviderError,
  AIProviderUnavailableError,
  ProviderHealthStatus,
  AIGenerateOptions,
} from './AIProvider.js';
import { OpenRouterProvider } from './adapters/openrouter.provider.js';
import { GeminiProvider } from './adapters/gemini.provider.js';
import { OpenAIProvider } from './adapters/openai.provider.js';
import { AnthropicProvider } from './adapters/anthropic.provider.js';
import { GroqProvider } from './adapters/groq.provider.js';
import { DeepSeekProvider } from './adapters/deepseek.provider.js';
import { TogetherProvider } from './adapters/together.provider.js';
import { getProviderChainForTask, TASK_MODEL_REGISTRY } from './modelRegistry.js';

export interface AdminProviderSettings {
  openrouter: boolean;
  gemini: boolean;
  anthropic: boolean;
  openai: boolean;
  groq: boolean;
  deepseek: boolean;
  together: boolean;
}

/**
 * Estimate token counts based on character length heuristics (approx 4 chars per token).
 */
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

/**
 * Estimate cost in USD based on provider/model rates per 1,000 tokens.
 */
const calculateCost = (
  providerKey: string,
  promptTokens: number,
  completionTokens: number
): number => {
  const rates: Record<string, { prompt: number; completion: number }> = {
    openrouter: { prompt: 0.00015, completion: 0.0006 },
    gemini: { prompt: 0.0001, completion: 0.0004 },
    openai: { prompt: 0.00015, completion: 0.0006 },
    anthropic: { prompt: 0.003, completion: 0.015 },
    groq: { prompt: 0.00005, completion: 0.0001 },
    deepseek: { prompt: 0.00014, completion: 0.00028 },
    together: { prompt: 0.0002, completion: 0.0002 },
  };

  const rate = rates[providerKey.toLowerCase()] || { prompt: 0.0002, completion: 0.0005 };
  const cost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;
  return Number(cost.toFixed(6));
};

export class AIRouter implements AIProvider {
  readonly name = 'AIRouter';

  private providers: Map<string, AIProvider> = new Map();
  private adminSettings: AdminProviderSettings;

  constructor() {
    this.providers.set('openrouter', new OpenRouterProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('deepseek', new DeepSeekProvider());
    this.providers.set('together', new TogetherProvider());

    this.adminSettings = {
      openrouter: true,
      gemini: true,
      anthropic: true,
      openai: true,
      groq: true,
      deepseek: true,
      together: true,
    };

    this.logStartupInfo();
  }

  /**
   * Log startup information for transparency and auditability.
   */
  logStartupInfo(): void {
    const defaultProvider = config.defaultAiProvider || 'openrouter';
    const openrouterKey = config.ai.openrouter.apiKey;
    const openrouterConfigured = !!openrouterKey;
    const researchConfig = TASK_MODEL_REGISTRY.research;
    const providerChain = getProviderChainForTask('research', defaultProvider);

    logger.info(`=======================================================`);
    logger.info(`[AIRouter System Initialization]`);
    logger.info(`  DEFAULT_AI_PROVIDER (env): "${defaultProvider}"`);
    logger.info(`  OPENROUTER_API_KEY Configured: ${openrouterConfigured}`);
    logger.info(`  Selected Primary Provider: "${researchConfig.primaryProvider}"`);
    logger.info(`  Selected Primary Model: "${researchConfig.primaryModel}"`);
    logger.info(`  Default Fallback Chain: [${providerChain.join(' -> ')}]`);
    logger.info(`=======================================================`);
  }

  isConfigured(): boolean {
    for (const [key, provider] of this.providers.entries()) {
      if (this.adminSettings[key as keyof AdminProviderSettings] && provider.isConfigured()) {
        return true;
      }
    }
    return false;
  }

  getModels(): string[] {
    const models: string[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.getModels());
    }
    return Array.from(new Set(models));
  }

  getAdminSettings(): AdminProviderSettings {
    return { ...this.adminSettings };
  }

  updateAdminSettings(settings: Partial<AdminProviderSettings>): AdminProviderSettings {
    this.adminSettings = { ...this.adminSettings, ...settings };
    logger.info('[AIRouter] Updated admin provider settings', { settings: this.adminSettings });
    return this.getAdminSettings();
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    const active = this.isConfigured();
    return {
      name: this.name,
      enabled: true,
      healthy: active,
      latencyMs: Date.now() - startTime,
      models: this.getModels(),
      error: active ? undefined : 'No configured AI providers available',
    };
  }

  async getAllProviderStatuses(): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];
    for (const [key, provider] of this.providers.entries()) {
      const enabled = !!this.adminSettings[key as keyof AdminProviderSettings] && provider.isConfigured();
      if (!enabled) {
        results.push({
          name: provider.name,
          enabled: false,
          healthy: false,
          latencyMs: 0,
          models: provider.getModels(),
          error: provider.isConfigured() ? 'Disabled by admin' : 'API key not configured',
        });
      } else {
        results.push(await provider.healthCheck());
      }
    }
    return results;
  }

  /**
   * Main router execution loop: Handles retries, exponential backoff, and fallback chain.
   */
  private async routeOperation<T>(
    operationName: 'generate' | 'generateStructured' | 'embed',
    fn: (provider: AIProvider) => Promise<T>,
    promptText: string,
    options?: AIGenerateOptions
  ): Promise<T> {
    const taskCategory = options?.taskCategory || 'research';
    const defaultPrimary = config.defaultAiProvider || 'openrouter';
    const providerChain = getProviderChainForTask(taskCategory, defaultPrimary);
    const targetModel = options?.model || TASK_MODEL_REGISTRY[taskCategory]?.primaryModel || 'default';

    logger.info(
      `[AIRouter Runtime] Request Routing: TaskCategory="${taskCategory}" | Provider Chosen="${providerChain[0]}" | Model Chosen="${targetModel}" | Fallback Chain=[${providerChain.join(' -> ')}]`
    );

    let fallbackCount = 0;
    let totalRetries = 0;
    const errorsEncountered: string[] = [];

    for (const providerKey of providerChain) {
      const isEnabled = this.adminSettings[providerKey as keyof AdminProviderSettings];
      const provider = this.providers.get(providerKey);

      if (!isEnabled || !provider || !provider.isConfigured()) {
        continue;
      }

      const maxRetries = 3;
      const baseDelay = 1000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        try {
          logger.info(
            `[AIRouter Runtime] Executing "${operationName}" via Provider="${provider.name}" | Model="${targetModel}" | Attempt=${attempt}/${maxRetries}`
          );

          const result = await fn(provider);
          const latencyMs = Date.now() - startTime;

          // Asynchronous telemetry logging
          this.logTelemetry({
            provider: provider.name,
            model: options?.model || provider.getModels()[0] || targetModel,
            taskCategory,
            latencyMs,
            promptText,
            resultText: typeof result === 'string' ? result : JSON.stringify(result),
            fallbackUsed: fallbackCount > 0,
            retriesCount: totalRetries,
            success: true,
          });

          return result;
        } catch (rawErr) {
          totalRetries++;
          const error = rawErr as Error;
          const providerErr = rawErr instanceof AIProviderError ? rawErr : null;
          const isRetryable =
            !providerErr ||
            providerErr.isQuotaError ||
            providerErr.statusCode === 429 ||
            (providerErr.statusCode && providerErr.statusCode >= 500) ||
            /timeout|network|ECONNRESET|ETIMEDOUT/i.test(error.message);

          logger.warn(
            `[AIRouter Runtime] Provider [${provider.name}] Attempt ${attempt}/${maxRetries} failed with error: "${error.message}". Total Retries: ${totalRetries}`
          );

          errorsEncountered.push(`[${provider.name}] ${error.message}`);

          if (attempt < maxRetries && isRetryable) {
            const expDelay = baseDelay * Math.pow(2, attempt - 1);
            const retryDelay = providerErr?.retryDelayMs
              ? Math.max(providerErr.retryDelayMs, expDelay)
              : expDelay;

            logger.info(`[AIRouter Runtime] Retrying [${provider.name}] in ${retryDelay}ms...`);
            await new Promise((r) => setTimeout(r, retryDelay));
          } else {
            // Attempt limit reached for this provider — fallback to next provider in chain
            break;
          }
        }
      }

      fallbackCount++;
      logger.warn(`[AIRouter Runtime] Falling back from [${provider.name}] to next candidate provider.`);
    }

    const failureSummary = `All configured AI providers failed. Summary:\n${errorsEncountered.join('\n')}`;
    logger.error(`[AIRouter Runtime] Total pipeline failure: ${failureSummary}`);

    this.logTelemetry({
      provider: 'AIRouter',
      model: targetModel,
      taskCategory,
      latencyMs: 0,
      promptText,
      resultText: '',
      fallbackUsed: fallbackCount > 0,
      retriesCount: totalRetries,
      success: false,
      error: failureSummary,
    });

    throw new AIProviderUnavailableError(failureSummary);
  }

  private logTelemetry(params: {
    provider: string;
    model: string;
    taskCategory: string;
    latencyMs: number;
    promptText: string;
    resultText: string;
    fallbackUsed: boolean;
    retriesCount: number;
    success: boolean;
    error?: string;
  }): void {
    const promptTokens = estimateTokens(params.promptText);
    const completionTokens = estimateTokens(params.resultText);
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(params.provider, promptTokens, completionTokens);

    logger.info(`[AIRouter Telemetry] Provider: ${params.provider} | Model: ${params.model} | Latency: ${params.latencyMs}ms | Tokens: ${totalTokens} | Cost: $${estimatedCost} | Fallback: ${params.fallbackUsed}`);

    // Asynchronously log to MongoDB without blocking API response
    AIUsageLog.create({
      provider: params.provider,
      model: params.model,
      taskCategory: params.taskCategory,
      latencyMs: params.latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      fallbackUsed: params.fallbackUsed,
      retriesCount: params.retriesCount,
      success: params.success,
      error: params.error,
    }).catch((err) => {
      logger.debug('[AIRouter] Failed to record usage log', { error: (err as Error).message });
    });
  }

  async generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string> {
    return this.routeOperation('generate', (provider) => provider.generate(prompt, system, options), prompt, options);
  }

  async generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T> {
    return this.routeOperation(
      'generateStructured',
      (provider) => provider.generateStructured<T>(prompt, system, options),
      prompt,
      options
    );
  }

  async embed(text: string): Promise<number[]> {
    return this.routeOperation('embed', (provider) => provider.embed(text), text);
  }
}

export const aiRouter = new AIRouter();
