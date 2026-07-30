import { BaseAgent } from './base.agent.js';
import {
  GapFinderInput,
  GapFinderOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/gapFinder.prompt.js';

export class GapFinderAgent extends BaseAgent<GapFinderInput, GapFinderOutput> {
  readonly name = 'GapFinderAgent';

  getSystemPrompt(_input: GapFinderInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: GapFinderInput): string {
    return buildUserPrompt(input);
  }
}
