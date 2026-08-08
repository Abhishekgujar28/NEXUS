import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExportSnapshot } from '../../src/export/export.aggregator.js';
import ResearchJob from '../../src/models/ResearchJob.js';
import ResearchSource from '../../src/models/ResearchSource.js';
import EvidenceClaim from '../../src/models/EvidenceClaim.js';
import ExistingSolution from '../../src/models/ExistingSolution.js';
import InnovationGap from '../../src/models/InnovationGap.js';
import { JobCheckpoint } from '../../src/models/JobCheckpoint.js';

describe('Research Run Isolation', () => {
  it('should isolate artifacts strictly by researchJobId and avoid data leakage between runs', async () => {
    // Mock database records simulating two runs for the same project
    const projectId = '507f191e810c19729de860ea';
    const jobIdRunA = '507f191e810c19729de860eb';
    const jobIdRunB = '507f191e810c19729de860ec';

    const originalJobFindOne = ResearchJob.findOne;
    const originalSourceFind = ResearchSource.find;
    const originalClaimFind = EvidenceClaim.find;
    const originalSolutionFind = ExistingSolution.find;
    const originalGapFind = InnovationGap.find;
    const originalCheckpointFindOne = JobCheckpoint.findOne;

    try {
      (ResearchJob as any).findOne = (query: any) => {
        const id = query._id?.toString() || query.jobId;
        const targetId = id === jobIdRunA ? jobIdRunA : jobIdRunB;
        return Promise.resolve({
          _id: targetId,
          projectId,
          status: 'completed',
          progress: 100,
          metadata: { queries: [`query for ${targetId}`] },
          createdAt: new Date(),
          completedAt: new Date(),
        });
      };

      (JobCheckpoint as any).findOne = () => Promise.resolve(null);

      (ResearchSource as any).find = (query: any) => {
        const jobId = query.researchJobId;
        if (jobId === jobIdRunA) {
          return Promise.resolve([
            { _id: 'src_A1', title: 'Run A Source 1', provider: 'arxiv', sourceType: 'paper', url: 'https://arxiv.org/a1', credibilityScore: 0.9 },
          ]);
        }
        if (jobId === jobIdRunB) {
          return Promise.resolve([
            { _id: 'src_B1', title: 'Run B Source 1', provider: 'github', sourceType: 'repo', url: 'https://github.com/b1', credibilityScore: 0.8 },
            { _id: 'src_B2', title: 'Run B Source 2', provider: 'semanticScholar', sourceType: 'paper', url: 'https://semanticscholar.org/b2', credibilityScore: 0.95 },
          ]);
        }
        return Promise.resolve([]);
      };

      (EvidenceClaim as any).find = (query: any) => {
        const jobId = query.researchJobId;
        if (jobId === jobIdRunA) {
          return Promise.resolve([{ claim: 'Claim from Run A', category: 'general', confidence: 0.9, supportingSourceIds: ['src_A1'] }]);
        }
        return Promise.resolve([{ claim: 'Claim from Run B', category: 'performance', confidence: 0.85, supportingSourceIds: ['src_B1'] }]);
      };

      (ExistingSolution as any).find = (query: any) => {
        const jobId = query.researchJobId;
        if (jobId === jobIdRunA) {
          return Promise.resolve([{ name: 'Solution A', category: 'tool', description: 'Run A Tool', sourceIds: ['src_A1'] }]);
        }
        return Promise.resolve([{ name: 'Solution B', category: 'framework', description: 'Run B Framework', sourceIds: ['src_B1'] }]);
      };

      (InnovationGap as any).find = (query: any) => {
        const jobId = query.researchJobId;
        if (jobId === jobIdRunA) {
          return Promise.resolve([{ title: 'Gap A', impact: 'high', difficulty: 'medium', evidenceSourceIds: ['src_A1'] }]);
        }
        return Promise.resolve([{ title: 'Gap B', impact: 'medium', difficulty: 'low', evidenceSourceIds: ['src_B1'] }]);
      };

      const Project = (await import('../../src/models/Project.js')).default;
      const originalProjectFindById = Project.findById;
      (Project as any).findById = () => Promise.resolve({
        _id: projectId,
        title: 'Multi-Run Project',
        description: 'Testing research run data isolation across exports',
        status: 'complete',
      });

      // Export Run A
      const snapshotA = await buildExportSnapshot(projectId, jobIdRunA);
      assert.equal(snapshotA.metadata.researchJobId, jobIdRunA);
      assert.equal(snapshotA.claims[0].claim, 'Claim from Run A');
      assert.equal(snapshotA.solutions[0].name, 'Solution A');
      assert.equal(snapshotA.gaps[0].title, 'Gap A');
      assert.equal(snapshotA.selectedReferences.length, 1);
      assert.equal(snapshotA.selectedReferences[0].title, 'Run A Source 1');

      // Export Run B
      const snapshotB = await buildExportSnapshot(projectId, jobIdRunB);
      assert.equal(snapshotB.metadata.researchJobId, jobIdRunB);
      assert.equal(snapshotB.claims[0].claim, 'Claim from Run B');
      assert.equal(snapshotB.solutions[0].name, 'Solution B');
      assert.equal(snapshotB.gaps[0].title, 'Gap B');
      assert.equal(snapshotB.selectedReferences.length, 2);
      assert.equal(snapshotB.selectedReferences[0].title, 'Run B Source 2');

      // Verify Run A data did NOT leak into Run B
      const runBClaimTexts = snapshotB.claims.map(c => c.claim);
      assert.ok(!runBClaimTexts.includes('Claim from Run A'));

      Project.findById = originalProjectFindById;
    } finally {
      ResearchJob.findOne = originalJobFindOne;
      ResearchSource.find = originalSourceFind;
      EvidenceClaim.find = originalClaimFind;
      ExistingSolution.find = originalSolutionFind;
      InnovationGap.find = originalGapFind;
      JobCheckpoint.findOne = originalCheckpointFindOne;
    }
  });
});
