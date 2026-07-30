import { BaseAgent } from './base.agent.js';
import {
  QueryPlannerInput,
  QueryPlannerOutput,
  getSystemPrompt,
  buildUserPrompt,
} from './prompts/queryPlanner.prompt.js';
import { queryPlannerContract } from '../ai-output/contracts.js';

export class QueryPlannerAgent extends BaseAgent<QueryPlannerInput, QueryPlannerOutput> {
  readonly name = 'QueryPlannerAgent';
  protected readonly outputContract = queryPlannerContract;

  getSystemPrompt(_input: QueryPlannerInput): string {
    return getSystemPrompt();
  }

  buildUserPrompt(input: QueryPlannerInput): string {
    return buildUserPrompt(input);
  }
}
