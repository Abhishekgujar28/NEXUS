import { AIProviderError } from '../integrations/AIProvider.js';
import { createHash } from 'node:crypto';
import Project from '../models/Project.js';
import ResearchJob, { RESEARCH_STAGES } from '../models/ResearchJob.js';
import ResearchSource from '../models/ResearchSource.js';
import EvidenceClaim from '../models/EvidenceClaim.js';
import ExistingSolution from '../models/ExistingSolution.js';
import InnovationGap from '../models/InnovationGap.js';
import { logger } from '../core/logger.js';
import { AppError, ErrorCodes } from '../core/errors.js';

import { ProblemUnderstandingAgent } from '../agents/problemUnderstanding.agent.js';
import { QueryPlannerAgent } from '../agents/queryPlanner.agent.js';
import { DeepSearchAgent } from '../agents/deepSearch.agent.js';
import { ResearchAnalysisAgent } from '../agents/researchAnalysis.agent.js';
import { GapFinderAgent } from '../agents/gapFinder.agent.js';
import { CriticAgent } from '../agents/critic.agent.js';
import { ArchitectAgent } from '../agents/architect.agent.js';
import { RoadmapAgent } from '../agents/roadmap.agent.js';
import { JobCheckpoint } from '../models/JobCheckpoint.js';
import { ProviderMetricsLog } from '../models/ProviderMetricsLog.js';
import { NormalizedSource } from '../research/providers/ResearchProvider.js';
import type { ProviderOutcome, ProviderResult } from '../research/providerRegistry.js';
import {
  emitResearchProgress,
  emitResearchComplete,
  emitResearchFailed,
  emitResearchSources,
  emitProviderHealth,
} from '../socket/socket.server.js';
import { indexResearchSources } from '../rag/pipeline.js';

type JobDoc = InstanceType<typeof ResearchJob>;

/** A stable identity for one provider result within a research job. */
const sourceHash = (source: NormalizedSource): string => {
  const canonical = [
    source.provider,
    source.sourceType,
    source.url ?? '',
    source.title ?? '',
    source.content ?? source.snippet ?? '',
  ].map((value) => value.trim().replace(/\s+/g, ' ').toLowerCase()).join('\n');
  return createHash('sha256').update(canonical).digest('hex');
};

/**
 * Progress mapping per pipeline stage key (0 - 100).
 */
const STAGE_PROGRESS_MAP: Record<string, number> = {
  understand: 10,
  plan: 20,
  search: 40,
  analyze: 50,
  solutions: 60,
  gaps: 70,
  stress: 80,
  architecture: 90,
  roadmap: 100,
};

export class ResearchOrchestrator {
  private projectId: string;
  private researchJobId: string;

  constructor(projectId: string, researchJobId: string) {
    this.projectId = projectId;
    this.researchJobId = researchJobId;
  }

  private setStage(
    job: JobDoc,
    key: string,
    status: 'running' | 'completed' | 'failed' | 'skipped',
    note?: string
  ): void {
    const stage = job.stages.find((s) => s.key === key);
    if (!stage) return;
    stage.status = status;
    if (status === 'running') stage.startedAt = new Date();
    if (['completed', 'failed', 'skipped'].includes(status)) {
      stage.completedAt = new Date();
    }
    if (note) stage.note = note;
  }

  private async updateStageProgress(job: JobDoc, stageKey: string, status: 'running' | 'completed' | 'failed' | 'skipped', note?: string): Promise<void> {
    this.setStage(job, stageKey, status, note);
    const progress = STAGE_PROGRESS_MAP[stageKey] ?? job.progress;
    job.progress = progress;
    await job.save();

    const stageLabel = job.stages.find((s) => s.key === stageKey)?.label ?? stageKey;
    emitResearchProgress(this.projectId, {
      jobId: this.researchJobId,
      stage: stageKey,
      stageLabel,
      progress,
      message: `${stageLabel} is ${status}`,
    });
  }

  private async saveCheckpoint(stageKey: string, stageIndex: number, outputData: any): Promise<void> {
    try {
      await JobCheckpoint.findOneAndUpdate(
        { jobId: this.researchJobId },
        {
          $set: {
            projectId: this.projectId,
            currentStage: stageIndex,
            [`stageOutputs.${stageKey}`]: outputData,
          },
          $addToSet: { completedStages: stageIndex },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.warn(`Failed to save checkpoint for stage ${stageKey}`, { error: (err as Error).message });
    }
  }

  private async getCheckpoint(): Promise<{ completedStages: number[]; stageOutputs: Record<string, any> } | null> {
    try {
      const cp = await JobCheckpoint.findOne({ jobId: this.researchJobId });
      if (!cp) return null;
      return { completedStages: cp.completedStages || [], stageOutputs: cp.stageOutputs || {} };
    } catch (err) {
      return null;
    }
  }

  /**
   * Idempotently persist one provider's sources as they stream in. Uses the
   * same per-source upsert keyed on (job, sourceHash) as the batch write, so
   * streaming and any later reconciliation never create duplicates. Never
   * throws: a persistence hiccup for one provider must not fail the job.
   */
  private async persistProviderSources(sources: NormalizedSource[]): Promise<number> {
    if (sources.length === 0) return 0;
    const byHash = new Map<string, NormalizedSource>();
    for (const source of sources) byHash.set(sourceHash(source), source);
    try {
      await ResearchSource.bulkWrite(
        [...byHash.entries()].map(([hash, s]) => ({
          updateOne: {
            filter: { researchJobId: this.researchJobId, sourceHash: hash },
            update: {
              $set: {
                projectId: this.projectId,
                researchJobId: this.researchJobId,
                sourceHash: hash,
                provider: s.provider,
                sourceType: s.sourceType,
                title: s.title,
                url: s.url,
                authors: s.authors,
                // publishedAt is already sanitized to a valid Date | null.
                publishedAt: s.publishedAt ?? undefined,
                snippet: s.snippet,
                content: s.content,
                query: s.query,
                metadata: s.metadata,
                relevanceScore: s.relevanceScore,
                credibilityScore: s.credibilityScore,
              },
            },
            upsert: true,
          },
        })) as any,
        { ordered: false }
      );
    } catch (err) {
      logger.warn('Failed to persist streamed provider sources', {
        error: (err as Error).message,
      });
    }
    return byHash.size;
  }

  /**
   * Handle one provider completing during deep search: persist its sources and
   * stream them to the frontend with the provider's status/latency/count.
   */
  private async onProviderComplete(result: ProviderResult): Promise<void> {
    await this.persistProviderSources(result.sources);
    emitResearchSources(this.projectId, {
      jobId: this.researchJobId,
      provider: result.provider,
      status: result.status,
      count: result.count,
      latencyMs: result.latencyMs,
      optional: result.optional,
      error: result.error,
      sources: result.sources,
    });
  }

  /**
   * Write the provider health summary to durable storage: onto the job's
   * metadata (for quick reads) and as one row per provider in
   * ProviderMetricsLog (for time-series diagnostics). Emits over socket too.
   */
  private async recordProviderHealth(job: JobDoc, health: ProviderOutcome[]): Promise<void> {
    const summary = health.map((h) => ({
      provider: h.provider,
      status: h.status,
      count: h.count,
      latencyMs: h.latencyMs,
      optional: h.optional,
      error: h.error,
    }));

    job.metadata = { ...(job.metadata || {}), providerHealth: summary };

    // One metrics-log row per provider. Best-effort — never blocks the job.
    try {
      await ProviderMetricsLog.insertMany(
        health.map((h) => ({
          providerName: h.provider,
          providerType: 'search' as const,
          state: h.status === 'fulfilled' ? 'CLOSED' : 'OPEN',
          failures: h.status === 'failed' ? 1 : 0,
          successes: h.status === 'fulfilled' ? 1 : 0,
          lastFailureReason: h.error,
          latencyMs: h.latencyMs,
          timestamp: new Date(),
        })),
        { ordered: false }
      );
    } catch (err) {
      logger.warn('Failed to write provider metrics log', { error: (err as Error).message });
    }

    emitProviderHealth(this.projectId, {
      jobId: this.researchJobId,
      projectId: this.projectId,
      providers: summary,
    });
  }

  /**
   * Run the full multi-agent research pipeline end to end with stage checkpointing.
   */
  async run(): Promise<void> {
    logger.info(`Starting ResearchOrchestrator for job ${this.researchJobId}`);

    const job = await ResearchJob.findById(this.researchJobId);
    if (!job) {
      throw new AppError('ResearchJob not found', 404, ErrorCodes.NOT_FOUND);
    }

    const project = await Project.findById(this.projectId);
    if (!project || project.status === 'deleted') {
      throw new AppError('Project not found or deleted', 404, ErrorCodes.NOT_FOUND);
    }

    // Fetch existing checkpoint if worker is resuming after crash
    const checkpoint = await this.getCheckpoint();
    const completedStages = new Set(checkpoint?.completedStages || []);
    const stageOutputs = checkpoint?.stageOutputs || {};

    // Mark Job & Project running
    job.status = 'running';
    job.startedAt = job.startedAt || new Date();
    await job.save();
    await Project.findByIdAndUpdate(this.projectId, {
      status: 'researching',
      researchProgress: 5,
    });

    try {
      // Stage 1: Understand Problem
      let understanding: any;
      if (completedStages.has(1) && stageOutputs.understand) {
        logger.info(`Resuming Stage 1 from checkpoint for job ${this.researchJobId}`);
        understanding = stageOutputs.understand;
        this.setStage(job, 'understand', 'completed', 'Loaded from checkpoint');
        await job.save();
      } else {
        this.setStage(job, 'understand', 'running');
        job.progress = STAGE_PROGRESS_MAP.understand;
        await job.save();

        const understandAgent = new ProblemUnderstandingAgent();
        understanding = await understandAgent.execute({
          title: project.title,
          description: project.description,
          domain: project.domain ?? undefined,
          projectType: project.projectType ?? undefined,
          targetUsers: project.targetUsers ?? undefined,
          platform: project.platform ?? undefined,
          preferredTech: project.preferredTech ?? undefined,
          constraints: project.constraints ?? undefined,
          teamSize: project.teamSize ?? undefined,
          timeline: project.timeline ?? undefined,
          skillLevel: project.skillLevel ?? undefined,
        });

        this.setStage(job, 'understand', 'completed');
        await job.save();
        await this.saveCheckpoint('understand', 1, understanding);
      }

      // Stage 2: Plan Queries
      let queries: any;
      if (completedStages.has(2) && stageOutputs.queries) {
        logger.info(`Resuming Stage 2 from checkpoint for job ${this.researchJobId}`);
        queries = stageOutputs.queries;
        this.setStage(job, 'plan', 'completed', 'Loaded from checkpoint');
        await job.save();
      } else {
        this.setStage(job, 'plan', 'running');
        job.progress = STAGE_PROGRESS_MAP.plan;
        await job.save();

        const queryPlanner = new QueryPlannerAgent();
        const planned = await queryPlanner.execute({
          title: project.title,
          description: project.description,
          understanding,
        });
        queries = planned.queries;

        this.setStage(job, 'plan', 'completed');
        await job.save();
        await this.saveCheckpoint('queries', 2, queries);
      }

      // Stage 3: Deep Search (Web, Papers, Code)
      this.setStage(job, 'search', 'running');
      job.progress = STAGE_PROGRESS_MAP.search;
      await job.save();

      const deepSearch = new DeepSearchAgent();
      // Sources are persisted + streamed to the frontend per provider as each
      // completes (via onProviderComplete); the returned `sources` are the
      // deduped union used by downstream analysis stages.
      const { sources, providerHealth } = await deepSearch.execute({
        queries,
        onProviderComplete: (result) => this.onProviderComplete(result),
      });

      // The reconciling batch write is idempotent with the streamed upserts,
      // so it simply guarantees the final deduped set is fully persisted.
      const uniqueSources = new Map<string, NormalizedSource>();
      for (const source of sources) uniqueSources.set(sourceHash(source), source);
      await this.persistProviderSources(sources);

      // Record + emit the provider health summary (status, latency, counts) and
      // stash it on the job metadata + metrics log.
      await this.recordProviderHealth(job, providerHealth);

      // The search stage succeeds as long as at least one provider returned
      // sources. If every provider was skipped or failed, the stage genuinely
      // failed and the job cannot proceed. Optional providers (e.g. IEEE 403)
      // never count against this because a failed optional provider simply
      // contributes zero sources — it doesn't gate success.
      const anyProviderSucceeded = providerHealth.some(
        (p) => p.status === 'fulfilled' && p.count > 0
      );
      const searchStatus = anyProviderSucceeded ? 'completed' : 'failed';
      const healthNote = providerHealth
        .map((p) => `${p.provider}:${p.status}(${p.count})`)
        .join(', ');

      this.setStage(job, 'search', searchStatus, healthNote);
      job.sourceCount = uniqueSources.size;
      await job.save();

      if (!anyProviderSucceeded) {
        throw new AppError(
          `Deep search produced no sources — all providers skipped or failed (${healthNote})`,
          502,
          ErrorCodes.BAD_GATEWAY
        );
      }

      // Stage 6 & 7: Analyze Research & Extract Existing Solutions
      this.setStage(job, 'analyze', 'running');
      this.setStage(job, 'solutions', 'running');
      job.progress = STAGE_PROGRESS_MAP.solutions;
      await job.save();

      const analyzer = new ResearchAnalysisAgent();
      const { claims, solutions } = await analyzer.execute({
        projectTitle: project.title,
        projectDescription: project.description,
        sources,
      });

      if (claims.length > 0) {
        await EvidenceClaim.deleteMany({ researchJobId: this.researchJobId });
        await EvidenceClaim.insertMany(
          claims.map((c) => ({
            projectId: this.projectId,
            researchJobId: this.researchJobId,
            claim: c.claim,
            supportingSources: c.supportingSources,
            contradictingSources: c.contradictingSources,
            confidence: c.confidence,
            category: c.category,
          }))
        );
      }

      if (solutions.length > 0) {
        await ExistingSolution.deleteMany({ researchJobId: this.researchJobId });
        await ExistingSolution.insertMany(
          solutions.map((s) => ({
            projectId: this.projectId,
            researchJobId: this.researchJobId,
            name: s.name,
            url: s.url,
            description: s.description,
            category: s.category,
            features: s.features,
            strengths: s.strengths,
            limitations: s.limitations,
            pricingModel: s.pricingModel,
            relevanceScore: s.relevanceScore,
          }))
        );
      }

      this.setStage(job, 'analyze', 'completed');
      this.setStage(job, 'solutions', 'completed');
      await job.save();

      // Stage 8: Gap Finder
      this.setStage(job, 'gaps', 'running');
      job.progress = STAGE_PROGRESS_MAP.gaps;
      await job.save();

      const gapFinder = new GapFinderAgent();
      const { gaps } = await gapFinder.execute({
        projectTitle: project.title,
        projectDescription: project.description,
        claims,
        solutions,
      });

      if (gaps.length > 0) {
        await InnovationGap.deleteMany({ researchJobId: this.researchJobId });
        await InnovationGap.insertMany(
          gaps.map((g) => ({
            projectId: this.projectId,
            researchJobId: this.researchJobId,
            title: g.title,
            description: g.description,
            category: g.category,
            impact: g.impact,
            difficulty: g.difficulty,
            opportunity: g.opportunity,
            affectedSolutions: g.affectedSolutions,
          }))
        );
      }

      this.setStage(job, 'gaps', 'completed');
      await job.save();

      // Stage 9: Critic / Stress Test
      this.setStage(job, 'stress', 'running');
      job.progress = STAGE_PROGRESS_MAP.stress;
      await job.save();

      const critic = new CriticAgent();
      const criticResult = await critic.execute({
        projectTitle: project.title,
        projectDescription: project.description,
        solutions,
        gaps,
      });

      this.setStage(job, 'stress', 'completed');
      await job.save();

      // Stage 10: Architect
      this.setStage(job, 'architecture', 'running');
      job.progress = STAGE_PROGRESS_MAP.architecture;
      await job.save();

      const architect = new ArchitectAgent();
      const architectureResult = await architect.execute({
        projectTitle: project.title,
        projectDescription: project.description,
        gaps,
        critiques: criticResult.critiques,
      });

      this.setStage(job, 'architecture', 'completed');
      await job.save();
      await this.saveCheckpoint('architecture', 10, architectureResult);

      // Stage 11: Roadmap
      this.setStage(job, 'roadmap', 'running');
      job.progress = STAGE_PROGRESS_MAP.roadmap;
      await job.save();

      const roadmapAgent = new RoadmapAgent();
      const roadmapResult = await roadmapAgent.execute({
        projectTitle: project.title,
        projectDescription: project.description,
        architecture: architectureResult,
        gaps,
      });

      this.setStage(job, 'roadmap', 'completed');
      await this.saveCheckpoint('roadmap', 11, roadmapResult);

      // Update Project Problem Understanding Blob
      await Project.findByIdAndUpdate(this.projectId, {
        status: 'complete',
        researchProgress: 100,
        confidenceScore: Math.round(criticResult.confidenceScore * 100),
        problemUnderstanding: {
          definition: understanding,
          architecture: {
            overview: architectureResult.overview,
            components: architectureResult.components,
            dataFlow: architectureResult.dataFlow,
            deploymentModel: architectureResult.deploymentModel,
            scalabilityNotes: architectureResult.scalabilityNotes,
          },
          recommendations: architectureResult.recommendations,
          roadmap: {
            phases: roadmapResult.phases,
            totalDuration: roadmapResult.totalDuration,
            criticalPath: roadmapResult.criticalPath,
            risks: roadmapResult.risks,
          },
        },
      });

      // Synchronously complete RAG vector indexing before marking job completed
      // so Copilot search is 100% ready the moment research:complete fires.
      try {
        logger.info(`[ResearchRun] Indexing RAG sources for job ${this.researchJobId}`);
        await indexResearchSources(this.projectId, this.researchJobId);
      } catch (ragErr) {
        logger.warn(`RAG indexing encountered an issue for project [${this.projectId}]`, {
          error: (ragErr as Error).message,
        });
      }

      // Mark Job Completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.metadata = {
        ...(job.metadata || {}),
        understanding,
        queries,
        critique: criticResult,
        architecture: architectureResult,
        roadmap: roadmapResult,
      };
      await job.save();

      const totalDurationMs = Date.now() - (job.startedAt ? job.startedAt.getTime() : Date.now());

      emitResearchComplete(this.projectId, {
        jobId: this.researchJobId,
        projectId: this.projectId,
        durationMs: totalDurationMs,
      });

      logger.info(`[ResearchRun] Completed successfully`, {
        runId: this.researchJobId,
        projectId: this.projectId,
        totalDurationMs,
        totalQueries: queries?.length ?? 0,
        sourceCount: job.sourceCount,
      });
    } catch (err) {
      const isAIError = err instanceof AIProviderError;
      logger.error(`ResearchOrchestrator failed for job ${this.researchJobId}`, {
        error: (err as Error).message,
        stack: (err as Error).stack,
        isAIProviderError: isAIError,
        ...(isAIError
          ? {
            provider: (err as AIProviderError).provider,
            model: (err as AIProviderError).model,
            statusCode: (err as AIProviderError).statusCode,
            retryDelayMs: (err as AIProviderError).retryDelayMs,
            isQuotaError: (err as AIProviderError).isQuotaError,
          }
          : {}),
      });

      // Mark currently running stages as failed gracefully
      for (const stage of job.stages) {
        if (stage.status === 'running') {
          stage.status = 'failed';
          stage.completedAt = new Date();
          stage.note = isAIError
            ? `[${(err as AIProviderError).provider} ${(err as AIProviderError).statusCode || ''}] ${(err as AIProviderError).message}`
            : (err as Error).message;
        }
      }

      job.status = 'failed';
      job.error = (err as Error).message;
      job.completedAt = new Date();
      if (isAIError) {
        const aiErr = err as AIProviderError;
        job.metadata = {
          ...(job.metadata || {}),
          providerError: {
            provider: aiErr.provider,
            model: aiErr.model,
            statusCode: aiErr.statusCode,
            retryDelayMs: aiErr.retryDelayMs,
            isQuotaError: aiErr.isQuotaError,
            message: aiErr.message,
          },
        };
      }
      await job.save();

      await Project.findByIdAndUpdate(this.projectId, { status: 'failed' });

      emitResearchFailed(this.projectId, {
        jobId: this.researchJobId,
        projectId: this.projectId,
        error: (err as Error).message,
      });

      throw err;
    }
  }
}
