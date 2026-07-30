import { BaseAgent } from './base.agent.js';
import {
  ResearchAnalysisInput,
  ResearchAnalysisOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/researchAnalysis.prompt.js';
import { researchAnalysisContract } from '../ai-output/contracts.js';

export class ResearchAnalysisAgent extends BaseAgent<
  ResearchAnalysisInput,
  ResearchAnalysisOutput
> {
  readonly name = 'ResearchAnalysisAgent';
  protected readonly outputContract = researchAnalysisContract;

  getSystemPrompt(_input: ResearchAnalysisInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: ResearchAnalysisInput): string {
    return buildUserPrompt(input);
  }
}
