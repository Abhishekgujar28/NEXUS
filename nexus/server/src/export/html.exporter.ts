import { ProjectExportData } from './markdown.exporter.js';

export const buildHtmlReport = (data: ProjectExportData): string => {
  const { project, sources, claims, solutions, gaps, architecture, roadmap } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NEXUS Research Report - ${project.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 40px auto; padding: 0 20px; background-color: #f8fafc; }
    h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1e293b; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; background: #e2e8f0; color: #334155; }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  </style>
</head>
<body>
  <h1>Research Report: ${project.title}</h1>
  <p><strong>Date:</strong> ${new Date(project.createdAt).toLocaleDateString()} | <strong>Domain:</strong> ${project.domain || 'General'}</p>

  <h2>Executive Summary</h2>
  <div class="card"><p>${project.description}</p></div>

  <h2>Key Evidence Claims (${claims.length})</h2>
  ${claims.map(c => `
    <div class="card">
      <span class="badge">${c.category.toUpperCase()}</span>
      <strong>${c.claim}</strong>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Confidence: ${Math.round(c.confidence * 100)}%</div>
    </div>
  `).join('')}

  <h2>Competitor & Market Solutions (${solutions.length})</h2>
  ${solutions.map(s => `
    <div class="card">
      <h3>${s.name} <span class="badge">${s.category}</span></h3>
      <p>${s.description}</p>
      ${s.features && s.features.length ? `<p><strong>Features:</strong> ${s.features.join(', ')}</p>` : ''}
    </div>
  `).join('')}

  <h2>Innovation Gaps Identified (${gaps.length})</h2>
  ${gaps.map(g => `
    <div class="card">
      <span class="badge badge-high">Impact: ${g.impact.toUpperCase()}</span>
      <span class="badge">Difficulty: ${g.difficulty.toUpperCase()}</span>
      <h3>${g.title}</h3>
      <p>${g.description}</p>
    </div>
  `).join('')}

  ${architecture ? `
    <h2>System Architecture</h2>
    <div class="card">
      <p>${architecture.overview}</p>
      ${architecture.dataFlow ? `<h4>Data Flow</h4><p>${architecture.dataFlow}</p>` : ''}
      ${architecture.deploymentModel ? `<h4>Deployment Model</h4><p>${architecture.deploymentModel}</p>` : ''}
    </div>
  ` : ''}

  ${roadmap && roadmap.phases ? `
    <h2>Execution Roadmap (${roadmap.totalDuration || 'Phased'})</h2>
    ${roadmap.phases.map((p, i) => `
      <div class="card">
        <h3>Phase ${i + 1}: ${p.name} (${p.duration})</h3>
        <ul>${p.milestones.map(m => `<li>${m}</li>`).join('')}</ul>
      </div>
    `).join('')}
  ` : ''}

  <h2>References (${sources.length})</h2>
  <ul>
    ${sources.map(src => `<li><a href="${src.url || '#'}" target="_blank">${src.title}</a> <em>(${src.provider})</em></li>`).join('')}
  </ul>
</body>
</html>`;
};
