import { BaseAgent } from './base.agent.js';
import {
  ArchitectInput,
  ArchitectureOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/architect.prompt.js';
import { architectureContract } from '../ai-output/contracts.js';

export class ArchitectAgent extends BaseAgent<ArchitectInput, ArchitectureOutput> {
  readonly name = 'ArchitectAgent';
  protected readonly outputContract = architectureContract;

  getSystemPrompt(_input: ArchitectInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: ArchitectInput): string {
    return buildUserPrompt(input);
  }
}
