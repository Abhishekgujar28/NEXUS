import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResearchExportData } from '../../src/export/export.types.js';
import { buildPdfReport } from '../../src/export/pdf.renderer.js';
import { buildDocxReport } from '../../src/export/docx.renderer.js';
import { buildMarkdownReport } from '../../src/export/markdown.exporter.js';
import { buildHtmlReport } from '../../src/export/html.exporter.js';
import { buildJsonReport } from '../../src/export/json.exporter.js';

const mockExportData: ResearchExportData = {
  metadata: {
    projectId: 'proj_123',
    researchJobId: 'job_abc789',
    title: 'Autonomous Drone Navigation System',
    description: 'A deep-learning based spatial mapping and obstacle avoidance system for micro-UAVs.',
    domain: 'Robotics & AI',
    status: 'complete',
    jobStatus: 'completed',
    durationMs: 45000,
    startedAt: new Date('2026-08-08T10:00:00Z'),
    completedAt: new Date('2026-08-08T10:00:45Z'),
    progress: 100,
    isPartial: false,
    generatedAt: new Date('2026-08-08T10:01:00Z'),
  },
  scope: {
    problemStatement: 'A deep-learning based spatial mapping and obstacle avoidance system for micro-UAVs.',
    objective: 'Investigate low-latency SLAM algorithms and onboard neural networks.',
    targetUsers: 'Robotics Engineers',
    platform: 'Embedded Edge Hardware (Jetson Orin)',
    constraints: 'Power consumption under 15W',
    assumptions: ['Camera feed available at 60fps'],
  },
  methodology: {
    queryCount: 5,
    totalSourcesDiscovered: 12,
    uniqueSourcesCount: 10,
    providersUsedCount: 3,
    durationSeconds: 45,
    providerHealth: [
      { provider: 'semanticScholar', status: 'fulfilled', count: 6, latencyMs: 320 },
      { provider: 'github', status: 'fulfilled', count: 4, latencyMs: 180 },
      { provider: 'arxiv', status: 'fulfilled', count: 2, latencyMs: 410 },
    ],
    searchCategories: ['semanticScholar', 'github', 'arxiv'],
  },
  queries: ['SLAM micro-UAV real-time', 'edge neural obstacle avoidance'],
  keyFindings: [
    {
      findingNumber: 1,
      title: 'Visual Inertial Odometry outperforms LiDAR in payload-constrained micro-drones.',
      explanation: 'VIO provides accurate pose estimation while remaining under 50g weight limit.',
      whyItMatters: 'Reduces drone weight by 70%, extending flight time significantly.',
      supportingEvidence: 'Benchmarked across 4 arXiv open datasets.',
      category: 'technical',
      confidence: 0.92,
      sourceRefIds: [1, 2],
    },
  ],
  claims: [
    {
      claim: 'VIO algorithms maintain stability at up to 15 m/s flight velocity.',
      category: 'performance',
      confidence: 0.88,
      supportingSources: ['Paper A', 'Paper B'],
      contradictingSources: [],
      sourceRefIds: [1],
    },
  ],
  solutions: [
    {
      name: 'ORB-SLAM3',
      category: 'Open Source Framework',
      description: 'Feature-based visual-inertial SLAM supporting monocular and stereo setups.',
      features: ['Real-time loop closing', 'Multi-map support'],
      strengths: ['High precision in structured environments'],
      limitations: ['High CPU consumption on single-thread'],
      technologies: ['C++', 'OpenCV'],
      sourceRefIds: [2],
    },
  ],
  gaps: [
    {
      title: 'Low-Light Thermal-Visual Sensor Fusion Gap',
      category: 'hardware',
      description: 'Lack of lightweight thermal-visual fusion pipelines for nocturnal search and rescue.',
      opportunity: 'Develop quantized multi-modal network for ARM Cortex accelerators.',
      impact: 'high',
      difficulty: 'high',
      affectedSolutions: ['ORB-SLAM3'],
      sourceRefIds: [1, 2],
    },
  ],
  stressTests: {
    critiques: [
      {
        area: 'Hardware',
        issue: 'Thermal throttling under continuous maximum GPU utilization',
        severity: 'major',
        suggestion: 'Implement adaptive frame rate dynamic throttling.',
      },
    ],
    overallAssessment: 'Solid baseline architecture with actionable edge thermal trade-offs.',
    confidenceScore: 0.85,
  },
  architecture: {
    overview: 'Edge AI processing pipeline using dual-camera stereo feed and IMU telemetry.',
    components: [
      {
        name: 'Pose Estimator',
        description: 'VIO calculation module',
        technology: 'C++ / CUDA',
        responsibilities: ['Feature extraction', 'Keyframe creation'],
      },
    ],
    recommendations: [
      {
        category: 'Compute',
        name: 'NVIDIA Jetson Orin Nano',
        rationale: 'Best power-to-FLOP ratio for 15W envelope',
        alternatives: ['Raspberry Pi 5 + Coral TPU'],
      },
    ],
    mermaidSource: 'graph TD\n    A[Camera] --> B[VIO Engine]\n    B --> C[Flight Controller]',
  },
  roadmap: {
    totalDuration: '8 Weeks',
    criticalPath: ['Phase 1 VIO Engine', 'Phase 2 Flight Testing'],
    phases: [
      {
        phase: 1,
        title: 'Core VIO Engine Integration',
        duration: '3 weeks',
        milestones: ['Sub-10ms frame extraction', 'Loop closure benchmark'],
        deliverables: ['LibVIO C++ binary'],
        dependencies: [],
      },
    ],
    risks: [
      {
        risk: 'Thermal throttling under direct sunlight',
        mitigation: 'Add passive aluminum heatsink',
        probability: 'medium',
        impact: 'medium',
      },
    ],
  },
  selectedReferences: [
    {
      refId: 1,
      sourceId: 'src_1',
      title: 'ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM',
      url: 'https://arxiv.org/abs/2007.11898',
      provider: 'arxiv',
      sourceType: 'paper',
      authors: ['Campos et al.'],
      publishedAt: new Date('2020-07-23'),
    },
    {
      refId: 2,
      sourceId: 'src_2',
      title: 'Real-time micro-UAV obstacle avoidance framework',
      url: 'https://github.com/example/drone-slam',
      provider: 'github',
      sourceType: 'repo',
    },
  ],
  allSources: [
    {
      id: 'src_1',
      provider: 'arxiv',
      sourceType: 'paper',
      title: 'ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM',
      url: 'https://arxiv.org/abs/2007.11898',
      retrievedAt: new Date(),
    },
  ],
};

describe('Research Export System', () => {
  it('should generate valid Markdown report containing key sections and reference IDs', () => {
    const md = buildMarkdownReport(mockExportData);
    assert.ok(md.includes('# NEXUS Research Report: Autonomous Drone Navigation System'));
    assert.ok(md.includes('## 1. Executive Summary'));
    assert.ok(md.includes('## 4. Key Findings'));
    assert.ok(md.includes('[1, 2]'));
    assert.ok(md.includes('## 9. System Architecture'));
    assert.ok(md.includes('```mermaid'));
    assert.ok(md.includes('## 11. Selected References'));
  });

  it('should generate valid Standalone HTML report containing CSS and structure', () => {
    const html = buildHtmlReport(mockExportData);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('NEXUS AUTONOMOUS RESEARCH REPORT'));
    assert.ok(html.includes('Autonomous Drone Navigation System'));
    assert.ok(html.includes('Visual Inertial Odometry outperforms LiDAR'));
    assert.ok(html.includes('ORB-SLAM3'));
    assert.ok(html.includes('Low-Light Thermal-Visual Sensor Fusion Gap'));
  });

  it('should generate valid JSON report payload with full source data', () => {
    const jsonStr = buildJsonReport(mockExportData);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.nexusVersion, '2.0.0');
    assert.equal(parsed.report.metadata.title, 'Autonomous Drone Navigation System');
    assert.equal(parsed.report.selectedReferences.length, 2);
    assert.equal(parsed.report.allSources.length, 1);
  });

  it('should generate non-empty PDF Buffer using pdfmake', async () => {
    const pdfBuf = await buildPdfReport(mockExportData);
    assert.ok(Buffer.isBuffer(pdfBuf));
    assert.ok(pdfBuf.length > 1000);
    // PDF magic bytes header check %PDF-
    assert.equal(pdfBuf.toString('utf8', 0, 4), '%PDF');
  });

  it('should generate non-empty DOCX Buffer using docx', async () => {
    const docxBuf = await buildDocxReport(mockExportData);
    assert.ok(Buffer.isBuffer(docxBuf));
    assert.ok(docxBuf.length > 1000);
    // DOCX zip magic header PK\x03\x04
    assert.equal(docxBuf.toString('utf8', 0, 2), 'PK');
  });
});
