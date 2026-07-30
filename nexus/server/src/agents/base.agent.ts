import { AIProvider, AIProviderError } from '../integrations/AIProvider.js';
import { aiRouter } from '../integrations/AIRouter.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { logger } from '../core/logger.js';

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;
  protected provider: AIProvider;
  protected taskCategory: string = 'research';

  constructor(provider: AIProvider = aiRouter) {
    this.provider = provider;
  }

  /**
   * System prompt establishing the agent's persona, expertise, and formatting rules.
   */
  abstract getSystemPrompt(input: TInput): string;

  /**
   * User prompt constructing structured input context for the AI model.
   */
  abstract buildUserPrompt(input: TInput): string;

  /**
   * Optional hook for subclasses to post-process or validate parsed outputs.
   */
  protected validateOutput(rawOutput: TOutput): TOutput {
    return rawOutput;
  }

  /**
   * Execute the agent pipeline:
   * 1. Check AI Provider configuration
   * 2. Build system & user prompts
   * 3. Invoke structured generation
   * 4. Validate & return typed result
   */
  async execute(input: TInput): Promise<TOutput> {
    if (!this.provider.isConfigured()) {
      throw new AppError(
        `AI Provider is not configured for agent [${this.name}]`,
        503,
        ErrorCodes.BAD_GATEWAY
      );
    }

    const systemPrompt = this.getSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    logger.info(`Executing AI Agent: ${this.name} (TaskCategory: ${this.taskCategory})`);

    try {
      const rawOutput = await this.provider.generateStructured<TOutput>(
        userPrompt,
        systemPrompt,
        { taskCategory: this.taskCategory }
      );

      const validated = this.validateOutput(rawOutput);
      return validated;
    } catch (err) {
      logger.error(`Error in AI Agent [${this.name}]`, {
        error: (err as Error).message,
        isAIProviderError: err instanceof AIProviderError,
      });
      if (err instanceof AppError || err instanceof AIProviderError) throw err;
      throw new AppError(
        `Agent [${this.name}] failed to execute: ${(err as Error).message}`,
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }
}
