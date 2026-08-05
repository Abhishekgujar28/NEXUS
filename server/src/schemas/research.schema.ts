import { z } from 'zod';

export const startResearchSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const previewResearchSchema = z.object({
  query: z.string().trim().min(1, 'query is required').max(500),
});

export const copilotChatSchema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().min(1).max(200).optional(),
});

export const testAgentSchema = z.object({
  agent: z.enum([
    'problemUnderstanding',
    'queryPlanner',
    'deepSearch',
    'researchAnalysis',
    'gapFinder',
    'critic',
    'architect',
    'roadmap',
  ]),
});
