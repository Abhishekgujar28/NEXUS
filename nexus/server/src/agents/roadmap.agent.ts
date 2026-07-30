import { BaseAgent } from './base.agent.js';
import {
  RoadmapInput,
  RoadmapOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/roadmap.prompt.js';

export class RoadmapAgent extends BaseAgent<RoadmapInput, RoadmapOutput> {
  readonly name = 'RoadmapAgent';

  getSystemPrompt(_input: RoadmapInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: RoadmapInput): string {
    return buildUserPrompt(input);
  }
}
