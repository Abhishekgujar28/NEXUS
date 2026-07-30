import { BaseAgent } from './base.agent.js';
import {
  QueryPlannerInput,
  QueryPlannerOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/queryPlanner.prompt.js';

export class QueryPlannerAgent extends BaseAgent<QueryPlannerInput, QueryPlannerOutput> {
  readonly name = 'QueryPlannerAgent';

  getSystemPrompt(_input: QueryPlannerInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: QueryPlannerInput): string {
    return buildUserPrompt(input);
  }
}
