import { ExportArtifact, ExportFormat } from '../models/ExportArtifact.js';
import { buildExportSnapshot } from './export.aggregator.js';
import { buildPdfReport } from './pdf.renderer.js';
import { buildDocxReport } from './docx.renderer.js';
import { buildMarkdownReport } from './markdown.exporter.js';
import { buildHtmlReport } from './html.exporter.js';
import { buildJsonReport } from './json.exporter.js';
import { logger } from '../core/logger.js';

export class ExportService {
  public static async generateReport(
    projectId: string,
    userId: string,
    format: ExportFormat,
    jobId?: string
  ): Promise<{ artifact: InstanceType<typeof ExportArtifact>; content: string | Buffer }> {
    const exportSnapshot = await buildExportSnapshot(projectId, jobId);

    let content: string | Buffer = '';
    switch (format) {
      case 'pdf':
        content = await buildPdfReport(exportSnapshot);
        break;
      case 'docx':
        content = await buildDocxReport(exportSnapshot);
        break;
      case 'markdown':
        content = buildMarkdownReport(exportSnapshot);
        break;
      case 'html':
        content = buildHtmlReport(exportSnapshot);
        break;
      case 'json':
        content = buildJsonReport(exportSnapshot);
        break;
      default:
        content = buildJsonReport(exportSnapshot);
    }

    const ext = format === 'markdown' ? 'md' : format;
    const fileKey = `exports/${projectId}/${exportSnapshot.metadata.researchJobId}/${format}_${Date.now()}.${ext}`;
    const downloadUrl = `/api/v1/export/${projectId}/${format}?download=true${jobId ? `&jobId=${jobId}` : ''}`;
    const fileSizeBytes = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);

    const artifact = await ExportArtifact.create({
      projectId,
      userId,
      format,
      title: `${exportSnapshot.metadata.title} - ${format.toUpperCase()} Research Report`,
      fileKey,
      downloadUrl,
      fileSizeBytes,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours TTL
    });

    logger.info(`Generated report artifact [${format}] for project [${projectId}] run [${exportSnapshot.metadata.researchJobId}] (${fileSizeBytes} bytes)`);

    return { artifact, content };
  }
}
