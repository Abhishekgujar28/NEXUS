import { ResearchExportData } from './export.types.js';

export const buildHtmlReport = (data: ResearchExportData): string => {
  const { metadata, scope, methodology, keyFindings, claims, solutions, gaps, stressTests, architecture, roadmap, selectedReferences } = data;

  const title = metadata.title || 'Research Report';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NEXUS Research Report - ${title}</title>
  <style>
    :root {
      --primary: #0f172a;
      --primary-accent: #0284c7;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --badge-bg: #e0f2fe;
      --badge-text: #0369a1;
      --danger-bg: #fef2f2;
      --danger-text: #991b1b;
      --success-bg: #f0fdf4;
      --success-text: #166534;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-main);
      background-color: var(--bg);
      padding: 40px 20px;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
    }

    .header-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
    }

    .brand-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #38bdf8;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .header-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; line-height: 1.2; }
    .header-desc { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }

    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      border-top: 1px solid #334155;
      padding-top: 16px;
      font-size: 13px;
      color: #cbd5e1;
    }

    .meta-item strong { color: #ffffff; }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      margin: 36px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .card-title { font-size: 16px; font-weight: 700; color: var(--primary); margin-bottom: 6px; }
    .card-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      background: var(--badge-bg);
      color: var(--badge-text);
      text-transform: uppercase;
    }

    .badge-danger { background: var(--danger-bg); color: var(--danger-text); }
    .badge-success { background: var(--success-bg); color: var(--success-text); }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
    }

    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: var(--primary);
    }

    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background-color: #fafafa; }

    .diagram-container {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 16px 0;
      overflow-x: auto;
    }

    .diagram-container img {
      max-width: 100%;
      height: auto;
    }

    .reference-list {
      list-style: none;
    }

    .reference-item {
      padding: 12px;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .reference-item a {
      color: var(--primary-accent);
      text-decoration: none;
      word-break: break-all;
    }

    .reference-item a:hover { text-decoration: underline; }

    .callout {
      background: #f0f9ff;
      border-left: 4px solid var(--primary-accent);
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 20px;
      font-size: 14px;
    }

    @media print {
      body { background: #ffffff; padding: 0; color: #000000; }
      .container { max-width: 100%; }
      .header-card { background: #0f172a !important; color: #ffffff !important; -webkit-print-color-adjust: exact; }
      .card { page-break-inside: avoid; border: 1px solid #ccc; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="brand-badge">NEXUS AUTONOMOUS RESEARCH REPORT</div>
      <h1 class="header-title">${title}</h1>
      <p class="header-desc">${metadata.description}</p>
      <div class="header-meta">
        <div class="meta-item">Domain: <strong>${metadata.domain || 'General Research'}</strong></div>
        <div class="meta-item">Date: <strong>${new Date(metadata.generatedAt).toLocaleDateString()}</strong></div>
        <div class="meta-item">Run ID: <strong>${metadata.researchJobId.substring(0, 12)}</strong></div>
        <div class="meta-item">Duration: <strong>${methodology.durationSeconds} sec</strong></div>
        <div class="meta-item">Status: <strong>${metadata.isPartial ? 'Partial' : 'Complete'}</strong></div>
      </div>
    </div>

    <!-- 1. Executive Summary -->
    <h2 class="section-title">1. Executive Summary</h2>
    <div class="callout">
      <p><strong>Problem Statement:</strong> ${scope.problemStatement}</p>
      ${scope.objective ? `<p style="margin-top:6px;"><strong>Objective:</strong> ${scope.objective}</p>` : ''}
      ${keyFindings.length > 0 ? `<p style="margin-top:6px;"><strong>Top Discovery:</strong> ${keyFindings[0].title} <span class="badge">${Math.round(keyFindings[0].confidence * 100)}% Confidence</span></p>` : ''}
    </div>

    <!-- 2. Research Scope -->
    <h2 class="section-title">2. Research Scope</h2>
    <div class="card">
      <ul style="padding-left: 20px; font-size: 14px;">
        <li><strong>Target Users:</strong> ${scope.targetUsers || 'Engineers & Technical Decision Makers'}</li>
        <li><strong>Target Platform:</strong> ${scope.platform || 'Web & Cloud Infrastructure'}</li>
        <li><strong>Constraints:</strong> ${scope.constraints || 'Modern architecture & performance'}</li>
      </ul>
    </div>

    <!-- 3. Research Methodology -->
    <h2 class="section-title">3. Research Methodology</h2>
    <table>
      <thead>
        <tr>
          <th>Queries Executed</th>
          <th>Sources Analyzed</th>
          <th>Unique Sources</th>
          <th>Providers Used</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${methodology.queryCount}</td>
          <td>${methodology.totalSourcesDiscovered}</td>
          <td>${methodology.uniqueSourcesCount}</td>
          <td>${methodology.providersUsedCount}</td>
          <td>${methodology.durationSeconds} sec</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. Key Findings -->
    <h2 class="section-title">4. Key Findings (${keyFindings.length})</h2>
    ${keyFindings.map(kf => {
      const refStr = kf.sourceRefIds.length ? ` <sup style="color:var(--primary-accent)">[${kf.sourceRefIds.join(', ')}]</sup>` : '';
      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="card-title">Finding #${kf.findingNumber}: ${kf.title}${refStr}</div>
            <span class="badge">${Math.round(kf.confidence * 100)}% Confidence</span>
          </div>
          <p class="card-subtitle"><strong>Why it matters:</strong> ${kf.whyItMatters}</p>
          <p style="font-size:13px; color:#475569;"><strong>Evidence:</strong> ${kf.supportingEvidence}</p>
        </div>
      `;
    }).join('')}

    <!-- 5. Evidence & Claims -->
    <h2 class="section-title">5. Evidence & Claims (${claims.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Claim Statement</th>
          <th>Category</th>
          <th>Confidence</th>
          <th>Ref</th>
        </tr>
      </thead>
      <tbody>
        ${claims.map(c => `
          <tr>
            <td>${c.claim}</td>
            <td><span class="badge">${c.category}</span></td>
            <td><strong>${Math.round(c.confidence * 100)}%</strong></td>
            <td>${c.sourceRefIds.length ? `[${c.sourceRefIds.join(',')}]` : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- 6. Existing Solutions -->
    ${solutions.length > 0 ? `
      <h2 class="section-title">6. Existing Solutions & Market Alternatives (${solutions.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Solution</th>
            <th>Description & Features</th>
            <th>Strengths & Limitations</th>
          </tr>
        </thead>
        <tbody>
          ${solutions.map(s => `
            <tr>
              <td><strong>${s.name}</strong><br><span class="badge">${s.category}</span></td>
              <td>${s.description}${s.features.length ? `<br><small style="color:#64748b">Features: ${s.features.join(', ')}</small>` : ''}</td>
              <td>
                ${s.strengths.length ? `<div style="color:var(--success-text)">+ ${s.strengths.join('<br>+ ')}</div>` : ''}
                ${s.limitations.length ? `<div style="color:var(--danger-text)">- ${s.limitations.join('<br>- ')}</div>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- 7. Innovation Gaps -->
    ${gaps.length > 0 ? `
      <h2 class="section-title">7. Innovation Gaps Identified (${gaps.length})</h2>
      ${gaps.map(g => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-title">💡 ${g.title}</div>
            <div>
              <span class="badge badge-danger">Impact: ${g.impact.toUpperCase()}</span>
              <span class="badge">Difficulty: ${g.difficulty.toUpperCase()}</span>
            </div>
          </div>
          <p style="font-size:14px; margin:8px 0; color:#334155;">${g.description}</p>
          ${g.opportunity ? `<p style="font-size:13px; color:var(--success-text); font-weight:600;">Opportunity: ${g.opportunity}</p>` : ''}
        </div>
      `).join('')}
    ` : ''}

    <!-- 8. Stress Testing -->
    ${stressTests && stressTests.critiques.length > 0 ? `
      <h2 class="section-title">8. Stress Testing & Technical Critique</h2>
      ${stressTests.overallAssessment ? `<p class="callout">${stressTests.overallAssessment}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Area</th>
            <th>Issue / Blind Spot</th>
            <th>Severity</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${stressTests.critiques.map(cr => `
            <tr>
              <td><strong>${cr.area}</strong></td>
              <td>${cr.issue}</td>
              <td><span class="badge ${cr.severity === 'critical' ? 'badge-danger' : ''}">${cr.severity.toUpperCase()}</span></td>
              <td>${cr.suggestion}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- 9. Architecture -->
    ${architecture ? `
      <h2 class="section-title">9. System Architecture</h2>
      <div class="card">
        <p style="font-size:14px; margin-bottom:12px;">${architecture.overview}</p>
        ${architecture.svgDataUri ? `
          <div class="diagram-container">
            <img src="${architecture.svgDataUri}" alt="Architecture Diagram" />
          </div>
        ` : ''}
        ${architecture.components.length > 0 ? `
          <h4 style="margin:16px 0 8px 0;">Component Breakdown</h4>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Technology</th>
                <th>Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              ${architecture.components.map(comp => `
                <tr>
                  <td><strong>${comp.name}</strong></td>
                  <td><code>${comp.technology}</code></td>
                  <td>${comp.responsibilities.join('; ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    ` : ''}

    <!-- 10. Implementation Roadmap -->
    ${roadmap && roadmap.phases.length > 0 ? `
      <h2 class="section-title">10. Implementation Roadmap (${roadmap.totalDuration || 'Phased'})</h2>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Goal & Duration</th>
            <th>Milestones & Deliverables</th>
          </tr>
        </thead>
        <tbody>
          ${roadmap.phases.map(p => `
            <tr>
              <td><strong>Phase ${p.phase}</strong></td>
              <td><strong>${p.title}</strong><br><small>(${p.duration})</small></td>
              <td>${p.milestones.join('<br>')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- 11. Selected References -->
    <h2 class="section-title">11. Selected References (${selectedReferences.length})</h2>
    <ul class="reference-list">
      ${selectedReferences.map(ref => `
        <li class="reference-item">
          <strong>[${ref.refId}] ${ref.title}</strong>
          <span style="color:#64748b;">(${ref.provider} • ${ref.sourceType})</span><br>
          ${ref.url ? `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.url}</a>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
</body>
</html>`;
};
