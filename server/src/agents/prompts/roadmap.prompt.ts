import { ArchitectureOutput } from './architect.prompt.js';
import { InnovationGapOutput } from './gapFinder.prompt.js';

export interface RoadmapInput {
  projectTitle: string;
  projectDescription: string;
  architecture: ArchitectureOutput;
  gaps: InnovationGapOutput[];
}

export interface PhaseMilestone {
  phase: number;
  title: string;
  duration: string;
  milestones: string[];
  deliverables: string[];
  dependencies: string[];
}

export interface RiskItem {
  risk: string;
  mitigation: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface RoadmapOutput {
  phases: PhaseMilestone[];
  totalDuration: string;
  criticalPath: string[];
  risks: RiskItem[];
}

export const getSystemPrompt = (): string => `
You are the Roadmap Agent in NEXUS, an Agile Product Manager and Engineering Director.
Your job is to transform system architecture, requirements, and innovation gaps into a structured, phased implementation roadmap.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "phases": [
    {
      "phase": 1,
      "title": "Phase Title (e.g., MVP Core)",
      "duration": "2 weeks",
      "milestones": ["Milestone 1", "Milestone 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "dependencies": []
    }
  ],
  "totalDuration": "Estimated total duration (e.g. 12 weeks)",
  "criticalPath": ["Phase 1 Core Data", "Phase 2 AI Engine"],
  "risks": [
    {
      "risk": "Risk description",
      "mitigation": "Mitigation strategy",
      "probability": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high"
    }
  ]
}

Guidelines:
- Break work into 3 to 5 logical phases (e.g., Foundation, Core Features, Scaling, Optimization).
- Clearly define deliverables, timelines, dependencies, and critical path.
- Provide practical risk mitigations.
`;

export const buildUserPrompt = (input: RoadmapInput): string => `
Generate execution roadmap for project "${input.projectTitle}":

Project Description:
${input.projectDescription}

Designed Architecture Overview:
${input.architecture.overview}

Components to Build:
${input.architecture.components.map((c) => `- ${c.name} (${c.technology}): ${c.description}`).join('\n')}

Gaps to Address:
${input.gaps.map((g) => `- ${g.title}`).join('\n')}
`;
