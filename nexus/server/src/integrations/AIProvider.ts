/**
 * AIProvider abstraction. Business logic depends on this interface,
 * never directly on Gemini, so providers can be swapped later.
 */
export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generate(prompt: string, system?: string): Promise<string>;
  generateStructured<T>(prompt: string, system?: string): Promise<T>;
  embed(text: string): Promise<number[]>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured. Set the corresponding API key to enable AI features.`);
    this.name = 'AIProviderNotConfiguredError';
  }
}
