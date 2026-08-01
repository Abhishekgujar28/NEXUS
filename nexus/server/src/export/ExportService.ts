import Project from '../models/Project.js';
import ResearchJob from '../models/ResearchJob.js';
import ResearchSource from '../models/ResearchSource.js';
import EvidenceClaim from '../models/EvidenceClaim.js';
import ExistingSolution from '../models/ExistingSolution.js';
import InnovationGap from '../models/InnovationGap.js';
import { ExportArtifact, ExportFormat } from '../models/ExportArtifact.js';
import { buildMarkdownReport, ProjectExportData } from './markdown.exporter.js';
import { buildHtmlReport } from './html.exporter.js';
import { buildJsonReport } from './json.exporter.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { logger } from '../core/logger.js';

export class ExportService {
  public static async generateReport(
    projectId: string,
    userId: string,
    format: ExportFormat
  ): Promise<{ artifact: InstanceType<typeof ExportArtifact>; content: string | Buffer }> {
    const project = await Project.findById(projectId);
    if (!project || project.status === 'deleted') {
      throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
    }

    const latestJob = await ResearchJob.findOne({ projectId }).sort({ createdAt: -1 });

    const sources = await ResearchSource.find({ projectId }).limit(50);
    const claims = await EvidenceClaim.find({ projectId }).limit(50);
    const solutions = await ExistingSolution.find({ projectId }).limit(50);
    const gaps = await InnovationGap.find({ projectId }).limit(50);

    const exportData: ProjectExportData = {
      project: {
        title: project.title,
        description: project.description,
        domain: project.domain ?? undefined,
        status: project.status,
        createdAt: project.createdAt,
      },
      sources: sources.map((s) => ({ title: s.title, url: s.url ?? undefined, provider: s.provider, snippet: s.snippet ?? undefined })),
      claims: claims.map((c) => ({ claim: c.claim, confidence: c.confidence, category: c.category })),
      solutions: solutions.map((s) => ({ name: s.name, description: s.description || '', category: s.category || 'general', features: s.features || [] })),
      gaps: gaps.map((g) => ({ title: g.title, description: g.description || '', impact: g.impact, difficulty: g.difficulty })),
      architecture: project.problemUnderstanding?.architecture,
      roadmap: project.problemUnderstanding?.roadmap,
    };

    let content: string | Buffer = '';
    switch (format) {
      case 'markdown':
        content = buildMarkdownReport(exportData);
        break;
      case 'html':
        content = buildHtmlReport(exportData);
        break;
      case 'json':
        content = buildJsonReport(exportData);
        break;
      case 'pdf':
        content = buildHtmlReport(exportData); // Rendered as HTML (convertible to PDF)
        break;
      case 'docx':
        content = buildMarkdownReport(exportData);
        break;
      default:
        content = buildJsonReport(exportData);
    }

    const fileKey = `exports/${projectId}/${format}_${Date.now()}.${format === 'markdown' ? 'md' : format}`;
    const downloadUrl = `/api/v1/export/download/${projectId}/${format}`;

    const artifact = await ExportArtifact.create({
      projectId,
      userId,
      format,
      title: `${project.title} - ${format.toUpperCase()} Report`,
      fileKey,
      downloadUrl,
      fileSizeBytes: Buffer.byteLength(content),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours TTL
    });

    logger.info(`Generated report artifact [${format}] for project [${projectId}]`);

    return { artifact, content };
  }
}
