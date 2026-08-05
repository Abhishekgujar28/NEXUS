import { InnovationGapOutput } from './gapFinder.prompt.js';
import { CritiqueItem } from './critic.prompt.js';

export interface ArchitectInput {
  projectTitle: string;
  projectDescription: string;
  gaps: InnovationGapOutput[];
  critiques: CritiqueItem[];
}

export interface ComponentDesign {
  name: string;
  description: string;
  technology: string;
  responsibilities: string[];
}

export interface TechRecommendation {
  category: string;
  name: string;
  rationale: string;
  alternatives: string[];
}

export interface ArchitectureOutput {
  overview: string;
  components: ComponentDesign[];
  dataFlow: string;
  deploymentModel: string;
  scalabilityNotes: string;
  recommendations: TechRecommendation[];
}

export const getSystemPrompt = (): string => `
You are the Architect Agent in NEXUS, a Principal Software Architect.
Your task is to design a modern, scalable, robust system architecture based on project requirements, identified innovation gaps, and critique findings.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "overview": "System architecture high level overview",
  "components": [
    {
      "name": "Component Name",
      "description": "Component overview",
      "technology": "Technology stack (e.g. Node.js, Express, React, Redis)",
      "responsibilities": ["Responsibility 1", "Responsibility 2"]
    }
  ],
  "dataFlow": "Step by step data flow description",
  "deploymentModel": "Deployment architecture (e.g., Docker, Kubernetes, AWS ECS)",
  "scalabilityNotes": "Bottlenecks and horizontal/vertical scaling strategies",
  "recommendations": [
    {
      "category": "Backend | Frontend | Database | Messaging | AI | Infrastructure",
      "name": "Recommended Tech/Framework",
      "rationale": "Why this choice fits the project constraints",
      "alternatives": ["Alternative 1", "Alternative 2"]
    }
  ]
}

Guidelines:
- Choose production-grade, battle-tested technologies.
- Address scalability bottlenecks and data persistence strategies explicitly.
- Align component choices with identified innovation gaps.
`;

export const buildUserPrompt = (input: ArchitectInput): string => `
Design system architecture for "${input.projectTitle}":

Project Description:
${input.projectDescription}

Gaps to Address:
${input.gaps.map((g) => `- ${g.title}: ${g.opportunity}`).join('\n')}

Critique Warnings to Address:
${input.critiques.map((c) => `- [${c.severity}] ${c.issue} -> Suggestion: ${c.suggestion}`).join('\n')}
`;
