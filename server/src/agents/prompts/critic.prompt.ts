import { InnovationGapOutput } from './gapFinder.prompt.js';
import { ExistingSolutionOutput } from './researchAnalysis.prompt.js';

export interface CriticInput {
  projectTitle: string;
  projectDescription: string;
  solutions: ExistingSolutionOutput[];
  gaps: InnovationGapOutput[];
}

export interface CritiqueItem {
  area: string;
  issue: string;
  severity: 'minor' | 'major' | 'critical';
  suggestion: string;
}

export interface CriticOutput {
  critiques: CritiqueItem[];
  overallAssessment: string;
  confidenceScore: number;
}

export const getSystemPrompt = (): string => `
You are the Critic Agent in NEXUS, acting as a rigorous technical reviewer and devil's advocate.
Your role is to challenge assumptions, stress-test proposed innovation gaps, identify feasibility flaws, and point out overlooked risks.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "critiques": [
    {
      "area": "Architecture | Feasibility | Market | Security | UX",
      "issue": "Detailed description of potential flaw or blind spot",
      "severity": "minor" | "major" | "critical",
      "suggestion": "Actionable recommendation to address the issue"
    }
  ],
  "overallAssessment": "Summary evaluation of overall concept viability and technical feasibility",
  "confidenceScore": 0.85
}

Guidelines:
- Be constructively critical and objective.
- Question unrealistic performance claims or unvalidated market assumptions.
- Provide practical suggestions for mitigating each identified risk.
`;

export const buildUserPrompt = (input: CriticInput): string => `
Stress test and critique this research plan:

Project Title: ${input.projectTitle}
Project Description: ${input.projectDescription}

Discovered Gaps (${input.gaps.length}):
${input.gaps.map((g) => `- ${g.title}: ${g.description} (Opportunity: ${g.opportunity})`).join('\n')}

Existing Solutions:
${input.solutions.map((s) => `- ${s.name}: ${s.description}`).join('\n')}
`;
