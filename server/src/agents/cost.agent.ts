import { BaseAgent } from './base.agent.js';
import { z } from 'zod';
import { AIOutputContract } from '../ai-output/contracts.js';

export interface CostInput {
  projectTitle: string;
  projectDescription: string;
}

export interface CostOutput {
  estimatedMonthlyCloudUsd: number;
  estimatedAiTokenUsd: number;
  costOptimizationTips: string[];
}

const costContract: AIOutputContract<CostOutput> = {
  name: 'CostAgent',
  schema: z.object({
    estimatedMonthlyCloudUsd: z.number(),
    estimatedAiTokenUsd: z.number(),
    costOptimizationTips: z.array(z.string()),
  }),
  normalize: (val) => val as CostOutput,
};

export class CostAgent extends BaseAgent<CostInput, CostOutput> {
  readonly name = 'CostAgent';
  protected readonly outputContract = costContract;

  getSystemPrompt(_input: CostInput): string {
    return `You are the Cost Agent in NEXUS, a FinOps & Cloud Infrastructure Cost Estimator.
Estimate infrastructure and API token costs and suggest optimization strategies.
Respond ONLY with valid JSON conforming to:
{
  "estimatedMonthlyCloudUsd": number,
  "estimatedAiTokenUsd": number,
  "costOptimizationTips": ["string"]
}`;
  }

  buildUserPrompt(input: CostInput): string {
    return `Estimate budget for:
Title: ${input.projectTitle}
Description: ${input.projectDescription}`;
  }
}
