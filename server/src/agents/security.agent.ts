import { BaseAgent } from './base.agent.js';
import { z } from 'zod';
import { AIOutputContract } from '../ai-output/contracts.js';

export interface SecurityInput {
  projectTitle: string;
  projectDescription: string;
  architectureOverview?: string;
}

export interface SecurityOutput {
  threatModel: Array<{ threat: string; impact: 'low' | 'medium' | 'high'; mitigation: string }>;
  owaspTop10Risks: string[];
  complianceNotes: string[];
  securityScore: number;
}

const securityContract: AIOutputContract<SecurityOutput> = {
  name: 'SecurityAgent',
  schema: z.object({
    threatModel: z.array(
      z.object({
        threat: z.string().trim().min(1),
        impact: z.enum(['low', 'medium', 'high']),
        mitigation: z.string().trim().min(1),
      })
    ),
    owaspTop10Risks: z.array(z.string()),
    complianceNotes: z.array(z.string()),
    securityScore: z.number().min(0).max(100),
  }),
  normalize: (val) => val as SecurityOutput,
};

export class SecurityAgent extends BaseAgent<SecurityInput, SecurityOutput> {
  readonly name = 'SecurityAgent';
  protected readonly outputContract = securityContract;

  getSystemPrompt(_input: SecurityInput): string {
    return `You are the Security Agent in NEXUS, a Principal Cybersecurity Architect.
Your task is to analyze system specifications, identify threats (STRIDE / OWASP), and prescribe security controls.
Respond ONLY with valid JSON conforming to:
{
  "threatModel": [{"threat": "string", "impact": "low"|"medium"|"high", "mitigation": "string"}],
  "owaspTop10Risks": ["string"],
  "complianceNotes": ["string"],
  "securityScore": number (0-100)
}`;
  }

  buildUserPrompt(input: SecurityInput): string {
    return `Analyze security for:
Title: ${input.projectTitle}
Description: ${input.projectDescription}
Architecture: ${input.architectureOverview || 'Microservices / REST API'}`;
  }
}
