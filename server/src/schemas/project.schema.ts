import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(4000),
  domain: z.string().optional(),
  projectType: z.string().optional(),
  targetUsers: z.string().optional(),
  platform: z.string().optional(),
  preferredTech: z
    .union([
      z.array(z.string()),
      z.string().transform((s) => s.split(',').map((t) => t.trim()).filter(Boolean)),
    ])
    .optional()
    .default([]),
  constraints: z.string().optional(),
  teamSize: z.number().int().min(1).max(100).optional(),
  timeline: z.string().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// Member management: only editor/viewer may be assigned via the API.
// Ownership cannot be granted or transferred through this endpoint.
export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});
