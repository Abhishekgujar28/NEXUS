// @ts-ignore
import PdfPrinter from 'pdfmake/js/Printer.js';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces.js';
import { ResearchExportData } from './export.types.js';

const PrinterConstructor = (PdfPrinter as any).default || PdfPrinter;

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const defaultUrlResolver = {
  resolve: () => {},
  resolved: async () => {},
};

const printer = new PrinterConstructor(fonts, null, defaultUrlResolver);

function pdfToBuffer(pdfDoc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', (err) => reject(err));
    pdfDoc.end();
  });
}

export async function buildPdfReport(data: ResearchExportData): Promise<Buffer> {
  const { metadata, scope, methodology, keyFindings, claims, solutions, gaps, stressTests, architecture, roadmap, selectedReferences } = data;

  const content: Content[] = [];
  let sectionCounter = 1;

  // ==========================================
  // 1. COVER / HEADER BANNER
  // ==========================================
  content.push({
    stack: [
      { text: 'NEXUS', color: '#0284c7', fontSize: 11, bold: true },
      { text: 'TECHNICAL RESEARCH REPORT', color: '#64748b', fontSize: 8.5, bold: true, margin: [0, 2, 0, 8] },
      { text: metadata.title, fontSize: 22, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
      { text: metadata.description, fontSize: 9.5, color: '#475569', margin: [0, 0, 0, 12] },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }],
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          { text: `Domain: ${metadata.domain || 'General'}`, fontSize: 8.5, color: '#475569' },
          { text: `Date: ${new Date(metadata.generatedAt).toLocaleDateString()}`, fontSize: 8.5, color: '#475569' },
          { text: `Run ID: ${metadata.researchJobId.substring(0, 12)}`, fontSize: 8.5, color: '#475569' },
          { text: `Status: ${metadata.isPartial ? 'Partial Run' : 'Complete'}`, fontSize: 8.5, color: '#475569', alignment: 'right' },
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 16],
      },
    ],
  });

  // ==========================================
  // 2. RESEARCH STATISTICS COMPACT CARDS
  // ==========================================
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [4, 6, 4, 6],
            stack: [
              { text: `${methodology.queryCount}`, fontSize: 15, bold: true, color: '#0f172a', alignment: 'center' },
              { text: 'QUERIES PLANNED', fontSize: 7, bold: true, color: '#64748b', alignment: 'center' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [4, 6, 4, 6],
            stack: [
              { text: `${methodology.totalSourcesDiscovered}`, fontSize: 15, bold: true, color: '#0f172a', alignment: 'center' },
              { text: 'SOURCES ANALYZED', fontSize: 7, bold: true, color: '#64748b', alignment: 'center' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [4, 6, 4, 6],
            stack: [
              { text: `${methodology.providersUsedCount}`, fontSize: 15, bold: true, color: '#0f172a', alignment: 'center' },
              { text: 'PROVIDERS USED', fontSize: 7, bold: true, color: '#64748b', alignment: 'center' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [4, 6, 4, 6],
            stack: [
              { text: `${methodology.durationSeconds}s`, fontSize: 15, bold: true, color: '#0f172a', alignment: 'center' },
              { text: 'EXECUTION TIME', fontSize: 7, bold: true, color: '#64748b', alignment: 'center' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 16],
  });

  // ==========================================
  // 3. EXECUTIVE SUMMARY
  // ==========================================
  content.push({
    unbreakable: true,
    stack: [
      { text: `${sectionCounter++}. Executive Summary`, style: 'sectionHeader' },
      {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: '#f0f9ff',
            borderColor: ['#0284c7', '#f0f9ff', '#f0f9ff', '#f0f9ff'],
            border: [true, false, false, false],
            margin: [12, 10, 12, 10],
            stack: [
              { text: 'PROBLEM STATEMENT', fontSize: 8, bold: true, color: '#0369a1', margin: [0, 0, 0, 2] },
              { text: scope.problemStatement, fontSize: 9.5, color: '#1e293b', margin: [0, 0, 0, 8] },
              { text: 'RESEARCH OBJECTIVE', fontSize: 8, bold: true, color: '#0369a1', margin: [0, 0, 0, 2] },
              { text: scope.objective || 'Identify key market solutions, technological innovations, and gaps.', fontSize: 9.5, color: '#1e293b', margin: [0, 0, 0, 8] },
              keyFindings.length > 0 ? {
                stack: [
                  { text: 'PRIMARY DISCOVERY', fontSize: 8, bold: true, color: '#0369a1', margin: [0, 0, 0, 2] },
                  { text: `${keyFindings[0].title} (Confidence: ${Math.round(keyFindings[0].confidence * 100)}%)`, fontSize: 9.5, bold: true, color: '#0f172a' },
                ],
              } : null,
            ].filter(Boolean) as Content[],
          }]],
        },
      },
    ],
    margin: [0, 0, 0, 14],
  });

  // ==========================================
  // 4. RESEARCH SCOPE
  // ==========================================
  content.push({
    unbreakable: true,
    stack: [
      { text: `${sectionCounter++}. Research Scope`, style: 'sectionHeader' },
      {
        ul: [
          `Target Users: ${scope.targetUsers || 'Software Engineers, Architects, Technical Decision Makers'}`,
          `Target Platform: ${scope.platform || 'Cross-platform / Web & Cloud Infrastructure'}`,
          `Constraints: ${scope.constraints || 'Modern maintainable architecture, cost optimization'}`,
        ],
        fontSize: 9,
        color: '#334155',
      },
    ],
    margin: [0, 0, 0, 14],
  });

  // ==========================================
  // 5. RESEARCH METHODOLOGY
  // ==========================================
  const providerRows: TableCell[][] = [
    [
      { text: 'Provider', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      { text: 'Status', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      { text: 'Sources Retained', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      { text: 'Latency (ms)', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
    ],
  ];

  for (const ph of methodology.providerHealth) {
    providerRows.push([
      { text: ph.provider, fontSize: 8.5 },
      { text: ph.status.toUpperCase(), fontSize: 8, bold: true, color: ph.status === 'fulfilled' ? '#166534' : '#b91c1c' },
      { text: `${ph.count}`, fontSize: 8.5 },
      { text: `${ph.latencyMs} ms`, fontSize: 8.5 },
    ]);
  }

  if (methodology.providerHealth.length === 0) {
    providerRows.push([
      { text: 'All Search Providers Aggregate', fontSize: 8.5 },
      { text: 'FULFILLED', fontSize: 8, bold: true, color: '#166534' },
      { text: `${methodology.totalSourcesDiscovered}`, fontSize: 8.5 },
      { text: `${methodology.durationSeconds * 1000} ms`, fontSize: 8.5 },
    ]);
  }

  content.push({
    stack: [
      { text: `${sectionCounter++}. Research Methodology & Provider Telemetry`, style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: providerRows,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    margin: [0, 0, 0, 14],
  });

  // ==========================================
  // 6. KEY FINDINGS (Card Layout)
  // ==========================================
  const sectionTitleKeyFindings = `${sectionCounter++}. Key Findings`;
  if (keyFindings.length === 0) {
    content.push({
      stack: [
        { text: sectionTitleKeyFindings, style: 'sectionHeader' },
        { text: 'No specific findings extracted for this research run.', fontSize: 9, italics: true },
      ],
      margin: [0, 0, 0, 14],
    });
  } else {
    const renderCard = (kf: typeof keyFindings[0]): Content => {
      const refStr = kf.sourceRefIds.length > 0 ? ` [${kf.sourceRefIds.join(', ')}]` : '';
      return {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: '#ffffff',
            borderColor: ['#0284c7', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            border: [true, true, true, true],
            margin: [10, 8, 10, 8],
            stack: [
              {
                columns: [
                  { text: `FINDING ${String(kf.findingNumber).padStart(2, '0')}`, fontSize: 8, bold: true, color: '#0284c7' },
                  { text: `${Math.round(kf.confidence * 100)}% CONFIDENCE`, fontSize: 8, bold: true, color: '#166534', alignment: 'right' },
                ],
              },
              { text: `${kf.title}${refStr}`, fontSize: 10.5, bold: true, color: '#0f172a', margin: [0, 3, 0, 3] },
              { text: `Why it matters: ${kf.whyItMatters}`, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 3] },
              { text: `Evidence: ${kf.supportingEvidence}`, fontSize: 8, color: '#64748b' },
            ],
          }]],
        },
        margin: [0, 0, 0, 8],
      };
    };

    content.push({
      unbreakable: true,
      stack: [
        { text: sectionTitleKeyFindings, style: 'sectionHeader' },
        renderCard(keyFindings[0]),
      ],
    });

    for (let i = 1; i < keyFindings.length; i++) {
      content.push({
        unbreakable: true,
        stack: [renderCard(keyFindings[i])],
      });
    }

    content.push({ text: '', margin: [0, 0, 0, 6] });
  }

  // ==========================================
  // 7. EVIDENCE & CLAIMS
  // ==========================================
  if (claims.length > 0) {
    const claimRows: TableCell[][] = [
      [
        { text: 'Claim Statement', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Category', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Confidence', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Ref', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      ],
    ];

    for (const c of claims) {
      const refStr = c.sourceRefIds.length ? `[${c.sourceRefIds.join(',')}]` : '-';
      claimRows.push([
        { text: c.claim, fontSize: 8.5 },
        { text: c.category.toUpperCase(), fontSize: 7.5 },
        { text: `${Math.round(c.confidence * 100)}%`, fontSize: 8.5, color: '#0284c7', bold: true },
        { text: refStr, fontSize: 8 },
      ]);
    }

    content.push({
      stack: [
        { text: `${sectionCounter++}. Evidence & Claims Matrix`, style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: claimRows,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      margin: [0, 0, 0, 14],
    });
  }

  // ==========================================
  // 8. EXISTING SOLUTIONS
  // ==========================================
  if (solutions.length > 0) {
    const solRows: TableCell[][] = [
      [
        { text: 'Solution', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Description & Features', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Strengths / Limitations', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      ],
    ];

    for (const s of solutions) {
      const feats = s.features.length ? `\nFeatures: ${s.features.join(', ')}` : '';
      const str = s.strengths.length ? `+ ${s.strengths.join('\n+ ')}` : '';
      const lim = s.limitations.length ? `\n- ${s.limitations.join('\n- ')}` : '';

      solRows.push([
        { text: `${s.name}\n(${s.category})`, bold: true, fontSize: 8.5 },
        { text: `${s.description}${feats}`, fontSize: 8 },
        { text: `${str}${lim}`, fontSize: 8 },
      ]);
    }

    content.push({
      stack: [
        { text: `${sectionCounter++}. Existing Solutions & Market Alternatives`, style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['25%', '40%', '35%'],
            body: solRows,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      margin: [0, 0, 0, 14],
    });
  }

  // ==========================================
  // 9. INNOVATION GAPS
  // ==========================================
  if (gaps.length > 0) {
    const sectionTitleGaps = `${sectionCounter++}. Innovation Gaps Identified`;

    const renderGapCard = (g: typeof gaps[0]): Content => {
      const refStr = g.sourceRefIds.length ? ` [${g.sourceRefIds.join(', ')}]` : '';
      return {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: '#ffffff',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [10, 8, 10, 8],
            stack: [
              {
                columns: [
                  { text: `${g.title}${refStr}`, bold: true, fontSize: 9.5, color: '#0f172a' },
                  { text: `IMPACT: ${g.impact.toUpperCase()} | DIFFICULTY: ${g.difficulty.toUpperCase()}`, fontSize: 7.5, bold: true, alignment: 'right', color: '#b91c1c' },
                ],
              },
              { text: g.description, fontSize: 8.5, color: '#334155', margin: [0, 3, 0, 2] },
              g.opportunity ? { text: `Opportunity: ${g.opportunity}`, fontSize: 8.5, color: '#15803d', bold: true } : null,
            ].filter(Boolean) as Content[],
          }]],
        },
        margin: [0, 0, 0, 8],
      };
    };

    content.push({
      unbreakable: true,
      stack: [
        { text: sectionTitleGaps, style: 'sectionHeader' },
        renderGapCard(gaps[0]),
      ],
    });

    for (let i = 1; i < gaps.length; i++) {
      content.push({
        unbreakable: true,
        stack: [renderGapCard(gaps[i])],
      });
    }

    content.push({ text: '', margin: [0, 0, 0, 6] });
  }

  // ==========================================
  // 10. STRESS TESTING / CRITIQUE
  // ==========================================
  if (stressTests && stressTests.critiques.length > 0) {
    const critRows: TableCell[][] = [
      [
        { text: 'Area', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Issue / Blind Spot', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Severity', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Mitigation Suggestion', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      ],
    ];

    for (const cr of stressTests.critiques) {
      const sevColor = cr.severity === 'critical' ? '#b91c1c' : cr.severity === 'major' ? '#c2410c' : '#475569';
      critRows.push([
        { text: cr.area, fontSize: 8.5, bold: true },
        { text: cr.issue, fontSize: 8 },
        { text: cr.severity.toUpperCase(), fontSize: 7.5, color: sevColor, bold: true },
        { text: cr.suggestion, fontSize: 8 },
      ]);
    }

    content.push({
      stack: [
        { text: `${sectionCounter++}. Stress Testing & Technical Critique`, style: 'sectionHeader' },
        stressTests.overallAssessment ? { text: `Assessment: ${stressTests.overallAssessment}`, fontSize: 8.5, italics: true, color: '#334155', margin: [0, 0, 0, 6] } : null,
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['18%', '37%', '15%', '30%'],
            body: critRows,
          },
          layout: 'lightHorizontalLines',
        },
      ].filter(Boolean) as Content[],
      margin: [0, 0, 0, 14],
    });
  }

  // ==========================================
  // 11. SYSTEM ARCHITECTURE (Intelligent Sub-Blocks)
  // ==========================================
  if (architecture) {
    // 11a. Section Title & Overview
    content.push({
      unbreakable: true,
      stack: [
        { text: `${sectionCounter++}. System Architecture`, style: 'sectionHeader' },
        { text: architecture.overview, fontSize: 9, color: '#334155', margin: [0, 0, 0, 8] },
      ],
    });

    // 11b. Diagram Block (Image kept together with its caption)
    if (architecture.pngBuffer) {
      try {
        content.push({
          unbreakable: true,
          stack: [
            {
              image: `data:image/png;base64,${architecture.pngBuffer.toString('base64')}`,
              width: 450,
              alignment: 'center',
              margin: [0, 4, 0, 6],
            },
            { text: 'Figure 1: High-Level System Architecture Flow Diagram', fontSize: 8, italics: true, color: '#64748b', alignment: 'center', margin: [0, 0, 0, 10] },
          ],
        });
      } catch (err) {
        // Fallback gracefully
      }
    } else {
      content.push({
        text: 'Architecture diagram unavailable for this research run.',
        fontSize: 8.5,
        italics: true,
        color: '#64748b',
        margin: [0, 0, 0, 8],
      });
    }

    // 11c. Component Table
    if (architecture.components.length > 0) {
      const compRows: TableCell[][] = [
        [
          { text: 'Component', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
          { text: 'Technology', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
          { text: 'Responsibilities', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        ],
      ];

      for (const comp of architecture.components) {
        compRows.push([
          { text: comp.name, bold: true, fontSize: 8.5 },
          { text: comp.technology, fontSize: 8.5, color: '#0284c7' },
          { text: comp.responsibilities.join('; '), fontSize: 8 },
        ]);
      }

      content.push({
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['25%', '25%', '50%'],
          body: compRows,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 14],
      });
    }
  }

  // ==========================================
  // 12. IMPLEMENTATION ROADMAP
  // ==========================================
  if (roadmap && roadmap.phases.length > 0) {
    const roadRows: TableCell[][] = [
      [
        { text: 'Phase', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Goal & Duration', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
        { text: 'Milestones & Deliverables', bold: true, fillColor: '#f1f5f9', fontSize: 8.5 },
      ],
    ];

    for (const p of roadmap.phases) {
      const ms = p.milestones.length ? `• ${p.milestones.join('\n• ')}` : '';
      roadRows.push([
        { text: `Phase ${p.phase}`, bold: true, fontSize: 8.5 },
        { text: `${p.title}\n(${p.duration})`, fontSize: 8.5 },
        { text: ms, fontSize: 8 },
      ]);
    }

    content.push({
      stack: [
        { text: `${sectionCounter++}. Implementation Roadmap (${roadmap.totalDuration || 'Phased'})`, style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['15%', '30%', '55%'],
            body: roadRows,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      margin: [0, 0, 0, 14],
    });
  }

  // ==========================================
  // 13. SELECTED REFERENCES (Compact)
  // ==========================================
  if (selectedReferences.length > 0) {
    const refItems: Content[] = selectedReferences.map((ref) => {
      const auth = ref.authors && ref.authors.length ? ` | Authors: ${ref.authors.join(', ')}` : '';
      const dateStr = ref.publishedAt ? ` | Published: ${new Date(ref.publishedAt).toLocaleDateString()}` : '';
      return {
        unbreakable: true,
        stack: [
          { text: `[${ref.refId}] ${ref.title}`, bold: true, fontSize: 8.5, color: '#0f172a' },
          { text: `Source: ${ref.provider} (${ref.sourceType})${auth}${dateStr}`, fontSize: 7.5, color: '#64748b' },
          ref.url ? { text: ref.url, fontSize: 7.5, color: '#0284c7', link: ref.url } : null,
        ].filter(Boolean) as Content[],
        margin: [0, 0, 0, 5],
      };
    });

    content.push({
      stack: [
        { text: `${sectionCounter++}. Selected References (${selectedReferences.length})`, style: 'sectionHeader' },
        ...refItems,
      ],
      margin: [0, 0, 0, 14],
    });
  }

  const shortTitle = metadata.title.length > 45 ? `${metadata.title.substring(0, 45)}...` : metadata.title;

  const docDefinition: TDocumentDefinitions = {
    content,
    footer: (currentPage, pageCount) => ({
      text: `NEXUS Research Report | Page ${currentPage} of ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94a3b8',
      margin: [0, 10, 0, 0],
    }),
    header: (currentPage) => currentPage > 1 ? ({
      text: `${shortTitle} — NEXUS Research Report`,
      alignment: 'right',
      fontSize: 7.5,
      color: '#cbd5e1',
      margin: [0, 15, 40, 0],
    }) : null,
    styles: {
      sectionHeader: {
        fontSize: 12.5,
        bold: true,
        color: '#0f172a',
        margin: [0, 12, 0, 6],
      },
    },
    pageMargins: [40, 40, 40, 45],
    defaultStyle: {
      font: 'Roboto',
    },
  };

  const pdfDoc = await printer.createPdfKitDocument(docDefinition);
  return pdfToBuffer(pdfDoc);
}
