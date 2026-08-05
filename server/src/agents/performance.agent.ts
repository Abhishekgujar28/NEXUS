import { BaseAgent } from './base.agent.js';
import { z } from 'zod';
import { AIOutputContract } from '../ai-output/contracts.js';

export interface PerformanceInput {
  projectTitle: string;
  projectDescription: string;
}

export interface PerformanceOutput {
  bottlenecks: string[];
  latencyTargetMs: number;
  cachingStrategy: string;
  performanceScore: number;
}

const performanceContract: AIOutputContract<PerformanceOutput> = {
  name: 'PerformanceAgent',
  schema: z.object({
    bottlenecks: z.array(z.string()),
    latencyTargetMs: z.number(),
    cachingStrategy: z.string().trim().min(1),
    performanceScore: z.number().min(0).max(100),
  }),
  normalize: (val) => val as PerformanceOutput,
};

export class PerformanceAgent extends BaseAgent<PerformanceInput, PerformanceOutput> {
  readonly name = 'PerformanceAgent';
  protected readonly outputContract = performanceContract;

  getSystemPrompt(_input: PerformanceInput): string {
    return `You are the Performance Agent in NEXUS, a Systems Performance & Optimization Specialist.
Analyze system requirements and specify latency targets, bottleneck risks, and caching strategies.
Respond ONLY with valid JSON conforming to:
{
  "bottlenecks": ["string"],
  "latencyTargetMs": number,
  "cachingStrategy": "string",
  "performanceScore": number (0-100)
}`;
  }

  buildUserPrompt(input: PerformanceInput): string {
    return `Evaluate performance for:
Title: ${input.projectTitle}
Description: ${input.projectDescription}`;
  }
}
