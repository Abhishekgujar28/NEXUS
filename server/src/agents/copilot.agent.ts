import { AIProvider } from '../integrations/AIProvider.js';
import { aiRouter } from '../integrations/AIRouter.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { logger } from '../core/logger.js';
import {
  CopilotInput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/copilot.prompt.js';

export class CopilotAgent {
  readonly name = 'CopilotAgent';
  private provider: AIProvider;

  constructor(provider: AIProvider = aiRouter) {
    this.provider = provider;
  }

  async execute(input: CopilotInput): Promise<{ answer: string }> {
    if (!this.provider.isConfigured()) {
      throw new AppError('Copilot provider is not configured', 503, ErrorCodes.BAD_GATEWAY);
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    logger.info(`Executing CopilotAgent for question: "${input.userQuestion.slice(0, 50)}..."`);

    try {
      const answer = await this.provider.generate(userPrompt, systemPrompt, { taskCategory: 'copilot' });
      return { answer };
    } catch (err) {
      logger.error('Error in CopilotAgent', { error: (err as Error).message });
      if (err instanceof AppError) throw err;
      throw new AppError(
        `CopilotAgent failed: ${(err as Error).message}`,
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }
}
