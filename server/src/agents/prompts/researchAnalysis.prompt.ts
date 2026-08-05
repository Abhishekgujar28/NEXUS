import { NormalizedSource } from '../../research/providers/ResearchProvider.js';

export interface ResearchAnalysisInput {
  projectTitle: string;
  projectDescription: string;
  sources: NormalizedSource[];
}

export interface EvidenceClaimOutput {
  claim: string;
  supportingSources: string[];
  contradictingSources: string[];
  confidence: number;
  category: string;
}

export interface ExistingSolutionOutput {
  name: string;
  url?: string;
  description: string;
  category: string;
  features: string[];
  strengths: string[];
  limitations: string[];
  pricingModel?: string;
  relevanceScore: number;
}

export interface ResearchAnalysisOutput {
  claims: EvidenceClaimOutput[];
  solutions: ExistingSolutionOutput[];
}

export const getSystemPrompt = (): string => `
You are the ResearchAnalysis Agent in NEXUS.
Your job is to analyze gathered research sources (articles, papers, repos, web content) and extract:
1. Verifiable evidence claims with confidence scores (0 to 1).
2. Existing products/solutions/competitors with features, strengths, and limitations.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "claims": [
    {
      "claim": "Statement of fact or insight",
      "supportingSources": ["http://url1 or Title1"],
      "contradictingSources": [],
      "confidence": 0.85,
      "category": "technical | market | performance | user_preference"
    }
  ],
  "solutions": [
    {
      "name": "Solution / Competitor Name",
      "url": "https://solution.com",
      "description": "Short overview of solution",
      "category": "competitor | open_source | framework | benchmark",
      "features": ["feature 1", "feature 2"],
      "strengths": ["strength 1"],
      "limitations": ["limitation 1"],
      "pricingModel": "Free / Subscription / Open Source",
      "relevanceScore": 0.90
    }
  ]
}

Guidelines:
- Reference actual source URLs or titles from the provided sources list.
- Keep claims distinct, factual, and backed by evidence.
- Identify real tools, projects, or papers as existing solutions.
`;

export const buildUserPrompt = (input: ResearchAnalysisInput): string => `
Analyze these research sources for the project "${input.projectTitle}":

Project Description:
${input.projectDescription}

Gathered Research Sources (${input.sources.length} sources):
${input.sources
  .slice(0, 15)
  .map(
    (s, idx) =>
      `[Source ${idx + 1}]
Title: ${s.title}
Provider: ${s.provider} (${s.sourceType})
URL: ${s.url}
Snippet: ${s.snippet}`
  )
  .join('\n\n')}
`;
