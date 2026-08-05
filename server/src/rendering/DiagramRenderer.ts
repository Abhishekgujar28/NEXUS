import { renderKrokiDiagram } from './kroki.renderer.js';
import { DiagramArtifact, DiagramType } from '../models/DiagramArtifact.js';
import { logger } from '../core/logger.js';

export interface RenderResult {
  svg?: string;
  pngDataUri?: string;
  pdfDataUri?: string;
}

export class DiagramRendererService {
  public static async renderAndStore(
    projectId: string,
    researchJobId: string,
    diagramType: DiagramType,
    title: string,
    mermaidSource: string
  ): Promise<InstanceType<typeof DiagramArtifact>> {
    let svgUrl = '';
    let pngUrl = '';
    let pdfUrl = '';

    try {
      // Attempt Kroki SVG rendering
      const svgBuffer = await renderKrokiDiagram(mermaidSource, 'svg');
      const svgBase64 = svgBuffer.toString('base64');
      svgUrl = `data:image/svg+xml;base64,${svgBase64}`;

      // Attempt Kroki PNG rendering
      const pngBuffer = await renderKrokiDiagram(mermaidSource, 'png');
      const pngBase64 = pngBuffer.toString('base64');
      pngUrl = `data:image/png;base64,${pngBase64}`;
    } catch (err) {
      logger.warn(`Server diagram render failed for [${diagramType}], saving AST source only`, {
        error: (err as Error).message,
      });
    }

    const artifact = await DiagramArtifact.findOneAndUpdate(
      { projectId, researchJobId, diagramType },
      {
        $set: {
          title,
          mermaidSource,
          svgUrl: svgUrl || undefined,
          pngUrl: pngUrl || undefined,
          pdfUrl: pdfUrl || undefined,
        },
      },
      { upsert: true, new: true }
    );

    return artifact;
  }
}
