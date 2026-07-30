import { BaseAgent } from './base.agent.js';
import {
  ProblemUnderstandingInput,
  ProblemUnderstandingOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/problemUnderstanding.prompt.js';
import { problemUnderstandingContract } from '../ai-output/contracts.js';

export class ProblemUnderstandingAgent extends BaseAgent<
  ProblemUnderstandingInput,
  ProblemUnderstandingOutput
> {
  readonly name = 'ProblemUnderstandingAgent';
  protected readonly outputContract = problemUnderstandingContract;

  getSystemPrompt(_input: ProblemUnderstandingInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: ProblemUnderstandingInput): string {
    return buildUserPrompt(input);
  }
}
