export interface CopilotInput {
  projectTitle: string;
  projectDomain?: string;
  projectDescription: string;
  ragContext?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userQuestion: string;
}

export const getSystemPrompt = (): string => `
You are NEXUS Copilot, an expert AI research assistant.
Your goal is to answer technical and strategic questions about the user's research project with accuracy, depth, and clarity.

Guidelines:
- If research context is provided, rely on it and cite sources where relevant.
- Be concise, technical, and objective.
- Help the user refine their innovation ideas, tech stack choices, architecture decisions, and roadmap steps.
`;

export const buildUserPrompt = (input: CopilotInput): string => `
Project Context:
Title: ${input.projectTitle}
Domain: ${input.projectDomain ?? 'General'}
Description: ${input.projectDescription}

${input.ragContext ? `Retrieved Research Context:\n${input.ragContext}\n` : ''}
${
  input.conversationHistory && input.conversationHistory.length > 0
    ? `Recent Conversation:\n${input.conversationHistory.map((h) => `${h.role}: ${h.content}`).join('\n')}\n`
    : ''
}
User Question:
${input.userQuestion}
`;
