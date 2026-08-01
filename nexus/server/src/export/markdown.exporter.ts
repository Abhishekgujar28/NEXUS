export interface ProjectExportData {
  project: {
    title: string;
    description: string;
    domain?: string;
    status: string;
    createdAt: Date;
  };
  sources: Array<{ title: string; url?: string; provider: string; snippet?: string }>;
  claims: Array<{ claim: string; confidence: number; category: string }>;
  solutions: Array<{ name: string; description: string; category: string; features: string[] }>;
  gaps: Array<{ title: string; description: string; impact: string; difficulty: string }>;
  architecture?: { overview: string; dataFlow?: string; deploymentModel?: string };
  roadmap?: { totalDuration?: string; phases?: Array<{ name: string; duration: string; milestones: string[] }> };
}

export const buildMarkdownReport = (data: ProjectExportData): string => {
  const { project, sources, claims, solutions, gaps, architecture, roadmap } = data;

  let md = `# Research Report: ${project.title}\n\n`;
  md += `**Date:** ${new Date(project.createdAt).toLocaleDateString()}\n`;
  md += `**Domain:** ${project.domain || 'General'}\n\n`;
  md += `## Executive Summary\n${project.description}\n\n`;

  md += `## Key Evidence Claims (${claims.length})\n`;
  claims.forEach((c, idx) => {
    md += `${idx + 1}. **[${c.category.toUpperCase()}]** ${c.claim} (Confidence: ${Math.round(c.confidence * 100)}%)\n`;
  });
  md += '\n';

  md += `## Competitor & Market Solutions (${solutions.length})\n`;
  solutions.forEach((s) => {
    md += `### ${s.name} (${s.category})\n`;
    md += `${s.description}\n`;
    if (s.features && s.features.length) {
      md += `**Features:** ${s.features.join(', ')}\n`;
    }
    md += '\n';
  });

  md += `## Innovation Gaps Identified (${gaps.length})\n`;
  gaps.forEach((g) => {
    md += `- **${g.title}** [Impact: ${g.impact.toUpperCase()}, Difficulty: ${g.difficulty.toUpperCase()}]\n  ${g.description}\n`;
  });
  md += '\n';

  if (architecture) {
    md += `## System Architecture\n${architecture.overview}\n\n`;
    if (architecture.dataFlow) md += `### Data Flow\n${architecture.dataFlow}\n\n`;
    if (architecture.deploymentModel) md += `### Deployment Model\n${architecture.deploymentModel}\n\n`;
  }

  if (roadmap && roadmap.phases) {
    md += `## Execution Roadmap (${roadmap.totalDuration || 'Phased'})\n`;
    roadmap.phases.forEach((p, idx) => {
      md += `### Phase ${idx + 1}: ${p.name} (${p.duration})\n`;
      p.milestones.forEach((m) => {
        md += `- [ ] ${m}\n`;
      });
      md += '\n';
    });
  }

  md += `## References & Sources (${sources.length})\n`;
  sources.forEach((src) => {
    md += `- [${src.title}](${src.url || '#'}) *(${src.provider})*\n`;
  });

  return md;
};
