export interface ProblemUnderstandingInput {
  title: string;
  description: string;
  domain?: string;
  projectType?: string;
  targetUsers?: string;
  platform?: string;
  preferredTech?: string[];
  constraints?: string;
  teamSize?: number;
  timeline?: string;
  skillLevel?: string;
}

export interface ProblemUnderstandingOutput {
  concepts: string[];
  domain: string;
  constraints: string[];
  successCriteria: string[];
  technicalRequirements: string[];
  assumptions: string[];
}

export const getSystemPrompt = (): string => `
You are the ProblemUnderstanding Agent in NEXUS, an AI research platform.
Your role is to analyze initial project metadata and decompose the core business and technical problem.

You MUST respond strictly with valid JSON conforming to the following structure:
{
  "concepts": ["concept1", "concept2"],
  "domain": "primary domain name",
  "constraints": ["constraint1", "constraint2"],
  "successCriteria": ["criterion1", "criterion2"],
  "technicalRequirements": ["req1", "req2"],
  "assumptions": ["assumption1", "assumption2"]
}

Guidelines:
- Extract key innovation concepts from the title and description.
- Identify both explicitly stated and implicit technical constraints.
- Formulate realistic success criteria for MVP and production stages.
- Keep output concise, clear, and actionable.
`;

export const buildUserPrompt = (input: ProblemUnderstandingInput): string => `
Decompose and analyze the following project metadata:

Title: ${input.title}
Description: ${input.description}
Domain: ${input.domain ?? 'Not specified'}
Project Type: ${input.projectType ?? 'Not specified'}
Target Users: ${input.targetUsers ?? 'Not specified'}
Target Platform: ${input.platform ?? 'Not specified'}
Preferred Technologies: ${Array.isArray(input.preferredTech) && input.preferredTech.length > 0 ? input.preferredTech.join(', ') : 'Not specified'}
Constraints: ${input.constraints ?? 'None specified'}
Team Size: ${input.teamSize ? `${input.teamSize} members` : 'Not specified'}
Timeline: ${input.timeline ?? 'Not specified'}
Skill Level: ${input.skillLevel ?? 'Not specified'}
`;
