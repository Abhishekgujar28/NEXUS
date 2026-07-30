import { BaseAgent } from './base.agent.js';
import {
  ProblemUnderstandingInput,
  ProblemUnderstandingOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/problemUnderstanding.prompt.js';

export class ProblemUnderstandingAgent extends BaseAgent<
  ProblemUnderstandingInput,
  ProblemUnderstandingOutput
> {
  readonly name = 'ProblemUnderstandingAgent';

  getSystemPrompt(_input: ProblemUnderstandingInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: ProblemUnderstandingInput): string {
    return buildUserPrompt(input);
  }
}
