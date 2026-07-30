/**
 * AIProvider abstraction and contracts for multi-provider orchestration.
 */

export interface ProviderHealthStatus {
  name: string;
  enabled: boolean;
  healthy: boolean;
  latencyMs: number;
  models: string[];
  error?: string;
}

export interface AIGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  taskCategory?: string;
}

export interface AIGenerateResult<T = string> {
  data: T;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  retriesCount: number;
  fallbackUsed: boolean;
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generate(prompt: string, system?: string, options?: AIGenerateOptions): Promise<string>;
  generateStructured<T>(prompt: string, system?: string, options?: AIGenerateOptions): Promise<T>;
  stream?(prompt: string, system?: string, options?: AIGenerateOptions): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
  healthCheck(): Promise<ProviderHealthStatus>;
  getModels(): string[];
}

export class AIProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured. Set the corresponding API key to enable AI features.`);
    this.name = 'AIProviderNotConfiguredError';
  }
}

export class AIProviderUnavailableError extends Error {
  constructor(message = 'All configured AI providers are unavailable or failed after retries.') {
    super(message);
    this.name = 'AIProviderUnavailableError';
  }
}

export interface AIProviderErrorOptions {
  provider: string;
  model?: string;
  statusCode?: number;
  retryDelayMs?: number;
  isQuotaError?: boolean;
  message: string;
  originalError?: unknown;
}

export class AIProviderError extends Error {
  readonly provider: string;
  readonly model?: string;
  readonly statusCode?: number;
  readonly retryDelayMs?: number;
  readonly isQuotaError: boolean;
  readonly originalError?: unknown;

  constructor(options: AIProviderErrorOptions) {
    super(options.message);
    this.name = 'AIProviderError';
    this.provider = options.provider;
    this.model = options.model;
    this.statusCode = options.statusCode;
    this.retryDelayMs = options.retryDelayMs;
    this.isQuotaError = options.isQuotaError ?? false;
    this.originalError = options.originalError;
  }
}
