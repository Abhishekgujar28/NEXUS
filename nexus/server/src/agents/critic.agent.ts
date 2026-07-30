import { BaseAgent } from './base.agent.js';
import {
  CriticInput,
  CriticOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/critic.prompt.js';

export class CriticAgent extends BaseAgent<CriticInput, CriticOutput> {
  readonly name = 'CriticAgent';

  getSystemPrompt(_input: CriticInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: CriticInput): string {
    return buildUserPrompt(input);
  }
}
