import { z } from 'zod';

export const exportReportSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
    format: z.enum(['pdf', 'docx', 'markdown', 'html', 'json']),
  }),
  query: z
    .object({
      download: z.string().optional(),
      jobId: z.string().optional(),
      researchJobId: z.string().optional(),
    })
    .optional(),
});

export type ExportReportInput = z.infer<typeof exportReportSchema>;
