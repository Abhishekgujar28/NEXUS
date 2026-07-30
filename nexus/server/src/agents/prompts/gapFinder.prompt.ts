import { ExistingSolutionOutput, EvidenceClaimOutput } from './researchAnalysis.prompt.js';

export interface GapFinderInput {
  projectTitle: string;
  projectDescription: string;
  claims: EvidenceClaimOutput[];
  solutions: ExistingSolutionOutput[];
}

export interface InnovationGapOutput {
  title: string;
  description: string;
  category: 'feature' | 'technical' | 'cost' | 'ux' | 'integration' | 'scalability' | 'user' | 'research';
  impact: 'low' | 'medium' | 'high' | 'critical';
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  opportunity: string;
  affectedSolutions: string[];
}

export interface GapFinderOutput {
  gaps: InnovationGapOutput[];
}

export const getSystemPrompt = (): string => `
You are the GapFinder Agent in NEXUS.
Your role is to discover innovation gaps and market opportunities by comparing existing market solutions against user requirements and technical claims.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "gaps": [
    {
      "title": "Short gap title",
      "description": "Detailed explanation of what is missing or unserved",
      "category": "feature" | "technical" | "cost" | "ux" | "integration" | "scalability" | "user" | "research",
      "impact": "low" | "medium" | "high" | "critical",
      "difficulty": "easy" | "moderate" | "hard" | "extreme",
      "opportunity": "How this project can exploit this gap",
      "affectedSolutions": ["Solution A", "Solution B"]
    }
  ]
}

Guidelines:
- Categorize each gap accurately using allowed category enums.
- Highlight concrete unserved needs or technical limitations in existing solutions.
- Detail clear product opportunities that position the project uniquely.
`;

export const buildUserPrompt = (input: GapFinderInput): string => `
Identify innovation gaps for project "${input.projectTitle}":

Project Description:
${input.projectDescription}

Existing Solutions Analyzed:
${input.solutions.map((s) => `- ${s.name}: ${s.description} (Limitations: ${s.limitations.join(', ')})`).join('\n')}

Key Evidence Claims:
${input.claims.map((c) => `- ${c.claim} (Confidence: ${c.confidence})`).join('\n')}
`;
