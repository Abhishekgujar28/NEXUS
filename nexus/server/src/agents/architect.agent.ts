import { BaseAgent } from './base.agent.js';
import {
  ArchitectInput,
  ArchitectureOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/architect.prompt.js';

export class ArchitectAgent extends BaseAgent<ArchitectInput, ArchitectureOutput> {
  readonly name = 'ArchitectAgent';

  getSystemPrompt(_input: ArchitectInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: ArchitectInput): string {
    return buildUserPrompt(input);
  }
}
