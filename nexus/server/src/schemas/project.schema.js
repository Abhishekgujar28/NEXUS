import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  domain: z.string().optional(),
  targetUsers: z.string().optional(),
  platform: z.string().optional(),
  preferredTech: z.string().optional(),
  constraints: z.string().optional(),
  teamSize: z.number().int().min(1).max(100).optional(),
  timeline: z.string().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
