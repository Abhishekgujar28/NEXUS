import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  AlignmentType,
  Footer,
  PageNumber,
  ImageRun,
  ExternalHyperlink,
  ShadingType,
} from 'docx';
import { ResearchExportData } from './export.types.js';

export async function buildDocxReport(data: ResearchExportData): Promise<Buffer> {
  const { metadata, scope, methodology, keyFindings, claims, solutions, gaps, stressTests, architecture, roadmap, selectedReferences } = data;

  const children: any[] = [];

  // Title Banner
  children.push(
    new Paragraph({
      text: 'NEXUS AUTONOMOUS RESEARCH REPORT',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    }),
    new Paragraph({
      text: metadata.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Description: ${metadata.description}`, italics: true, color: '555555' }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Domain: `, bold: true }),
        new TextRun({ text: `${metadata.domain || 'General'}  |  ` }),
        new TextRun({ text: `Generated: `, bold: true }),
        new TextRun({ text: `${new Date(metadata.generatedAt).toLocaleDateString()}  |  ` }),
        new TextRun({ text: `Run ID: `, bold: true }),
        new TextRun({ text: `${metadata.researchJobId.substring(0, 12)}` }),
      ],
      spacing: { after: 300 },
    })
  );

  // 1. Executive Summary
  children.push(
    new Paragraph({ text: '1. Executive Summary', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Problem Researched: ', bold: true }),
        new TextRun({ text: scope.problemStatement }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Objective: ', bold: true }),
        new TextRun({ text: scope.objective || 'Autonomous research analysis' }),
      ],
      spacing: { after: 100 },
    }),
    keyFindings.length > 0
      ? new Paragraph({
        children: [
          new TextRun({ text: 'Top Discovery: ', bold: true }),
          new TextRun({ text: `${keyFindings[0].title} (Confidence: ${Math.round(keyFindings[0].confidence * 100)}%)`, color: '0284C7' }),
        ],
        spacing: { after: 200 },
      })
      : new Paragraph({ text: '' })
  );

  // 2. Research Scope
  children.push(
    new Paragraph({ text: '2. Research Scope', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
    new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Target Users: ', bold: true }), new TextRun({ text: scope.targetUsers || 'Engineers and Architects' })] }),
    new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Platform: ', bold: true }), new TextRun({ text: scope.platform || 'Web & Cloud' })] }),
    new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Constraints: ', bold: true }), new TextRun({ text: scope.constraints || 'Scalability and Maintainability' })] }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  // 3. Research Methodology
  children.push(
    new Paragraph({ text: '3. Research Methodology', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
  );

  const methTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
        new TableCell({ shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
      ],
    }),
    new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'Queries Planned' })] }), new TableCell({ children: [new Paragraph({ text: `${methodology.queryCount}` })] })] }),
    new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'Sources Analyzed' })] }), new TableCell({ children: [new Paragraph({ text: `${methodology.totalSourcesDiscovered}` })] })] }),
    new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'Providers Used' })] }), new TableCell({ children: [new Paragraph({ text: `${methodology.providersUsedCount}` })] })] }),
    new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'Execution Duration' })] }), new TableCell({ children: [new Paragraph({ text: `${methodology.durationSeconds} seconds` })] })] }),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: methTableRows,
    }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  // 4. Key Findings
  children.push(
    new Paragraph({ text: '4. Key Findings', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
  );

  if (keyFindings.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'No key findings extracted.', italics: true })] }));
  } else {
    for (const kf of keyFindings) {
      const refStr = kf.sourceRefIds.length ? ` [${kf.sourceRefIds.join(', ')}]` : '';
      children.push(
        new Paragraph({
          text: `Finding #${kf.findingNumber}: ${kf.title}${refStr}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 150, after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Why it matters: ', bold: true }),
            new TextRun({ text: kf.whyItMatters }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Evidence: ', bold: true, color: '64748B' }),
            new TextRun({ text: kf.supportingEvidence, color: '64748B' }),
          ],
          spacing: { after: 150 },
        })
      );
    }
  }

  // 5. Evidence & Claims
  children.push(
    new Paragraph({ text: '5. Evidence & Claims Matrix', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
  );

  const claimTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Claim Statement', bold: true })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Confidence', bold: true })] })] }),
      ],
    }),
  ];

  for (const c of claims) {
    claimTableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: c.claim })] }),
          new TableCell({ children: [new Paragraph({ text: c.category.toUpperCase() })] }),
          new TableCell({ children: [new Paragraph({ text: `${Math.round(c.confidence * 100)}%` })] }),
        ],
      })
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: claimTableRows,
    }),
    new Paragraph({ text: '', spacing: { after: 200 } })
  );

  // 6. Existing Solutions
  if (solutions.length > 0) {
    children.push(
      new Paragraph({ text: '6. Existing Solutions & Market Alternatives', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
    );

    const solTableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Solution Name', bold: true })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Features / Strengths', bold: true })] })] }),
        ],
      }),
    ];

    for (const s of solutions) {
      solTableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: s.name, bold: true })] }), new Paragraph({ text: `(${s.category})` })] }),
            new TableCell({ children: [new Paragraph({ text: s.description })] }),
            new TableCell({ children: [new Paragraph({ text: s.features.join(', ') })] }),
          ],
        })
      );
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: solTableRows,
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
  }

  // 7. Research Gaps
  if (gaps.length > 0) {
    children.push(
      new Paragraph({ text: '7. Innovation Gaps Identified', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
    );

    for (const g of gaps) {
      children.push(
        new Paragraph({ text: g.title, heading: HeadingLevel.HEADING_2, spacing: { before: 100, after: 50 } }),
        new Paragraph({ text: g.description, spacing: { after: 50 } }),
        g.opportunity ? new Paragraph({ children: [new TextRun({ text: 'Opportunity: ', bold: true, color: '15803D' }), new TextRun({ text: g.opportunity })], spacing: { after: 100 } }) : new Paragraph({ text: '' })
      );
    }
  }

  // 8. Stress Testing
  if (stressTests && stressTests.critiques.length > 0) {
    children.push(
      new Paragraph({ text: '8. Stress Testing & Technical Critique', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
    );

    const critRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Area', bold: true })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Issue Identified', bold: true })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Suggestion', bold: true })] })] }),
        ],
      }),
    ];

    for (const cr of stressTests.critiques) {
      critRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cr.area, bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ text: cr.issue })] }),
            new TableCell({ children: [new Paragraph({ text: cr.suggestion })] }),
          ],
        })
      );
    }

    children.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: critRows }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    );
  }

  // 9. System Architecture
  if (architecture) {
    children.push(
      new Paragraph({ text: '9. System Architecture', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
      new Paragraph({ text: architecture.overview, spacing: { after: 150 } })
    );

    if (architecture.pngBuffer) {
      try {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: architecture.pngBuffer,
                transformation: { width: 500, height: 260 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      } catch (err) {
        // Fallback silently if image insertion fails
      }
    }

    if (architecture.components.length > 0) {
      const compRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Component', bold: true })] })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Technology', bold: true })] })] }),
            new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Responsibilities', bold: true })] })] }),
          ],
        }),
      ];

      for (const comp of architecture.components) {
        compRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: comp.name, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: comp.technology })] }),
              new TableCell({ children: [new Paragraph({ text: comp.responsibilities.join('; ') })] }),
            ],
          })
        );
      }

      children.push(
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: compRows }),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }
  }

  // 10. Roadmap
  if (roadmap && roadmap.phases.length > 0) {
    children.push(
      new Paragraph({ text: `10. Implementation Roadmap (${roadmap.totalDuration || 'Phased'})`, heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
    );

    for (const p of roadmap.phases) {
      children.push(
        new Paragraph({ text: `Phase ${p.phase}: ${p.title} (${p.duration})`, heading: HeadingLevel.HEADING_2, spacing: { before: 100, after: 50 } }),
        new Paragraph({ bullet: { level: 0 }, text: `Milestones: ${p.milestones.join(', ')}`, spacing: { after: 100 } })
      );
    }
  }

  // 11. Selected References
  children.push(
    new Paragraph({ text: '11. Selected References', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } })
  );

  for (const ref of selectedReferences) {
    const refText = `[${ref.refId}] ${ref.title} (${ref.provider})`;
    if (ref.url) {
      children.push(
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [new TextRun({ text: refText, color: '0284C7', underline: {} })],
              link: ref.url,
            }),
          ],
          spacing: { after: 50 },
        })
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: refText })], spacing: { after: 50 } }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'NEXUS Research Report | Page ' }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' of ' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
