import { z } from 'zod';

export const startResearchSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const copilotChatSchema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().min(1).max(200).optional(),
});
