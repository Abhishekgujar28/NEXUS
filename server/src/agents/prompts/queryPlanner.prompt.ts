import { ProblemUnderstandingOutput } from './problemUnderstanding.prompt.js';

export interface QueryPlannerInput {
  title: string;
  description: string;
  understanding: ProblemUnderstandingOutput;
}

export interface PlannedQuery {
  query: string;
  target: 'web' | 'academic' | 'code';
  rationale: string;
}

export interface QueryPlannerOutput {
  queries: PlannedQuery[];
}

export const getSystemPrompt = (): string => `
You are the QueryPlanner Agent in NEXUS.
Your task is to generate 8-15 highly effective search queries across Web, Academic (arXiv/Semantic Scholar), and Code (GitHub) search channels to research an innovation project.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "queries": [
    {
      "query": "search query string",
      "target": "web" | "academic" | "code",
      "rationale": "why this query is relevant"
    }
  ]
}

Guidelines:
- "web" queries should target current industry news, web applications, market solutions, and blog posts.
- "academic" queries should target scientific papers, machine learning research, benchmarks, and algorithms.
- "code" queries should target open-source GitHub repositories, technical implementations, and SDKs.
- Ensure queries are diverse, specific, and non-redundant.
`;

export const buildUserPrompt = (input: QueryPlannerInput): string => `
Generate target search queries for this project:

Title: ${input.title}
Description: ${input.description}
Extracted Concepts: ${input.understanding.concepts.join(', ')}
Domain: ${input.understanding.domain}
Technical Requirements: ${input.understanding.technicalRequirements.join(', ')}
`;
