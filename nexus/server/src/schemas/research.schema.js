import { z } from 'zod';

export const startResearchSchema = z.object({
  force: z.boolean().optional().default(false),
});
