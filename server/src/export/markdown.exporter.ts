import { ResearchExportData } from './export.types.js';

export const buildMarkdownReport = (data: ResearchExportData): string => {
  const { metadata, scope, methodology, keyFindings, claims, solutions, gaps, stressTests, architecture, roadmap, selectedReferences } = data;

  let md = `# NEXUS Research Report: ${metadata.title}\n\n`;
  md += `**Research Run ID:** \`${metadata.researchJobId}\`  \n`;
  md += `**Date:** ${new Date(metadata.generatedAt).toLocaleDateString()}  \n`;
  md += `**Domain:** ${metadata.domain || 'General Research'}  \n`;
  md += `**Duration:** ${methodology.durationSeconds} seconds  \n`;
  md += `**Status:** ${metadata.isPartial ? 'Partial Research Export' : 'Complete'}\n\n`;

  md += `---\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Summary\n\n`;
  md += `> **Problem Statement:** ${scope.problemStatement}\n\n`;
  if (scope.objective) {
    md += `**Objective:** ${scope.objective}\n\n`;
  }
  if (keyFindings.length > 0) {
    md += `**Primary Discovery:** ${keyFindings[0].title} *(Confidence: ${Math.round(keyFindings[0].confidence * 100)}%)*\n\n`;
  }

  // 2. Research Scope
  md += `## 2. Research Scope\n\n`;
  if (scope.targetUsers) md += `- **Target Users:** ${scope.targetUsers}\n`;
  if (scope.platform) md += `- **Target Platform:** ${scope.platform}\n`;
  if (scope.constraints) md += `- **Constraints:** ${scope.constraints}\n`;
  md += `\n`;

  // 3. Research Methodology
  md += `## 3. Research Methodology\n\n`;
  md += `| Metric | Value |\n`;
  md += `|---|---|\n`;
  md += `| Queries Executed | ${methodology.queryCount} |\n`;
  md += `| Sources Discovered | ${methodology.totalSourcesDiscovered} |\n`;
  md += `| Unique Sources | ${methodology.uniqueSourcesCount} |\n`;
  md += `| Search Providers | ${methodology.providersUsedCount} |\n`;
  md += `| Execution Time | ${methodology.durationSeconds} sec |\n\n`;

  if (methodology.providerHealth.length > 0) {
    md += `### Provider Status\n\n`;
    md += `| Provider | Status | Sources Retained | Latency |\n`;
    md += `|---|---|---|---|\n`;
    methodology.providerHealth.forEach((ph) => {
      md += `| ${ph.provider} | \`${ph.status.toUpperCase()}\` | ${ph.count} | ${ph.latencyMs} ms |\n`;
    });
    md += `\n`;
  }

  // 4. Key Findings
  md += `## 4. Key Findings\n\n`;
  if (keyFindings.length === 0) {
    md += `*No specific key findings extracted for this run.*\n\n`;
  } else {
    keyFindings.forEach((kf) => {
      const refStr = kf.sourceRefIds.length ? ` [${kf.sourceRefIds.join(', ')}]` : '';
      md += `### KEY FINDING #${kf.findingNumber}: ${kf.title}${refStr}\n\n`;
      md += `**Why it matters:** ${kf.whyItMatters}\n\n`;
      md += `**Supporting Evidence:** ${kf.supportingEvidence}\n\n`;
      md += `**Category:** \`${kf.category}\` | **Confidence:** ${Math.round(kf.confidence * 100)}%\n\n`;
    });
  }

  // 5. Evidence & Claims
  md += `## 5. Evidence & Claims\n\n`;
  if (claims.length === 0) {
    md += `*No evidence claims recorded.*\n\n`;
  } else {
    md += `| Claim | Category | Confidence | Sources |\n`;
    md += `|---|---|---|---|\n`;
    claims.forEach((c) => {
      const refStr = c.sourceRefIds.length ? `[${c.sourceRefIds.join(', ')}]` : '-';
      md += `| ${c.claim.replace(/\|/g, '\\|')} | \`${c.category}\` | ${Math.round(c.confidence * 100)}% | ${refStr} |\n`;
    });
    md += `\n`;
  }

  // 6. Existing Solutions
  md += `## 6. Existing Solutions & Competitors\n\n`;
  if (solutions.length === 0) {
    md += `*No competitor or existing solution data recorded for this run.*\n\n`;
  } else {
    md += `| Solution | Category | Key Features | Strengths | Limitations |\n`;
    md += `|---|---|---|---|---|\n`;
    solutions.forEach((s) => {
      const feats = s.features.join(', ') || 'N/A';
      const str = s.strengths.join('; ') || 'N/A';
      const lim = s.limitations.join('; ') || 'N/A';
      md += `| **${s.name}** | \`${s.category}\` | ${feats} | ${str} | ${lim} |\n`;
    });
    md += `\n`;
  }

  // 7. Research Gaps
  md += `## 7. Innovation Gaps Identified\n\n`;
  if (gaps.length === 0) {
    md += `*No innovation gaps identified.*\n\n`;
  } else {
    gaps.forEach((g) => {
      const refStr = g.sourceRefIds.length ? ` [${g.sourceRefIds.join(', ')}]` : '';
      md += `### 💡 ${g.title}${refStr}\n\n`;
      md += `${g.description}\n\n`;
      if (g.opportunity) md += `**Opportunity:** ${g.opportunity}\n\n`;
      md += `**Impact:** \`${g.impact.toUpperCase()}\` | **Difficulty:** \`${g.difficulty.toUpperCase()}\` | **Category:** \`${g.category}\`  \n\n`;
    });
  }

  // 8. Stress Testing / Critique
  if (stressTests && stressTests.critiques.length > 0) {
    md += `## 8. Stress Testing & Technical Critique\n\n`;
    if (stressTests.overallAssessment) {
      md += `> **Overall Assessment:** ${stressTests.overallAssessment}\n\n`;
    }
    md += `| Area | Issue / Blind Spot | Severity | Recommendation |\n`;
    md += `|---|---|---|---|\n`;
    stressTests.critiques.forEach((cr) => {
      md += `| **${cr.area}** | ${cr.issue} | \`${cr.severity.toUpperCase()}\` | ${cr.suggestion} |\n`;
    });
    md += `\n`;
  }

  // 9. System Architecture
  if (architecture) {
    md += `## 9. System Architecture\n\n`;
    md += `${architecture.overview}\n\n`;

    if (architecture.mermaidSource) {
      md += `\`\`\`mermaid\n${architecture.mermaidSource}\n\`\`\`\n\n`;
    }

    if (architecture.components.length > 0) {
      md += `### Component Architecture\n\n`;
      md += `| Component | Technology | Responsibilities |\n`;
      md += `|---|---|---|\n`;
      architecture.components.forEach((comp) => {
        md += `| **${comp.name}** | \`${comp.technology}\` | ${comp.responsibilities.join('; ')} |\n`;
      });
      md += `\n`;
    }

    if (architecture.recommendations.length > 0) {
      md += `### Technology Recommendations\n\n`;
      architecture.recommendations.forEach((rec) => {
        md += `- **[${rec.category}] ${rec.name}**: ${rec.rationale} *(Alternatives: ${rec.alternatives.join(', ') || 'None'})*\n`;
      });
      md += `\n`;
    }
  }

  // 10. Implementation Roadmap
  if (roadmap && roadmap.phases.length > 0) {
    md += `## 10. Implementation Roadmap (${roadmap.totalDuration || 'Phased'})\n\n`;
    md += `| Phase | Goal & Duration | Key Milestones | Dependencies |\n`;
    md += `|---|---|---|---|\n`;
    roadmap.phases.forEach((p) => {
      const ms = p.milestones.join('<br>') || 'N/A';
      const deps = p.dependencies.join(', ') || 'None';
      md += `| **Phase ${p.phase}** | **${p.title}**<br>(${p.duration}) | ${ms} | ${deps} |\n`;
    });
    md += `\n`;
  }

  // 11. Selected References
  md += `## 11. Selected References\n\n`;
  if (selectedReferences.length === 0) {
    md += `*No external references cited.*\n\n`;
  } else {
    selectedReferences.forEach((ref) => {
      const auth = ref.authors && ref.authors.length ? ` by ${ref.authors.join(', ')}` : '';
      const dateStr = ref.publishedAt ? ` (${new Date(ref.publishedAt).getFullYear()})` : '';
      const link = ref.url ? ` - [${ref.url}](${ref.url})` : '';
      md += `[${ref.refId}] **${ref.title}**${auth}${dateStr} *(Source: ${ref.provider})*${link}\n\n`;
    });
  }

  return md;
};
