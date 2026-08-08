import { Request, Response } from 'express';
import { ExportService } from '../export/ExportService.js';
import { ExportFormat } from '../models/ExportArtifact.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const requestExport = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const format = req.params.format as ExportFormat;
  const userId = req.user!._id;
  const jobId = (req.query.jobId || req.query.researchJobId) as string | undefined;

  const { artifact, content } = await ExportService.generateReport(projectId, userId, format, jobId);

  if (req.query.download === 'true') {
    const contentTypeMap: Record<ExportFormat, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      markdown: 'text/markdown',
      html: 'text/html',
      json: 'application/json',
    };

    const ext = format === 'markdown' ? 'md' : format;
    res.setHeader('Content-Type', contentTypeMap[format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${projectId}-report.${ext}"`);
    return res.send(content);
  }

  sendSuccess(res, { artifact }, 'Export artifact generated successfully');
});
