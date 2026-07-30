import { AIProviderError } from '../integrations/AIProvider.js';
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
import { NormalizedSource } from '../research/providers/ResearchProvider.js';
import {
  emitResearchProgress,
  emitResearchComplete,
  emitResearchFailed,
} from '../socket/socket.server.js';
import { indexResearchSources } from '../rag/pipeline.js';

type JobDoc = InstanceType<typeof ResearchJob>;

/**
 * Progress mapping per pipeline stage key (0 - 100).
 */
const STAGE_PROGRESS_MAP: Record<string, number> = {
  understand: 5,
  plan: 15,
  search_web: 25,
  search_papers: 30,
  search_github: 35,
  analyze: 50,
  solutions: 55,
  gaps: 65,
  stress: 75,
  architecture: 88,
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

  /**
   * Run the full multi-agent research pipeline end to end.
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

    // Mark Job & Project running
    job.status = 'running';
    job.startedAt = new Date();
    await job.save();
    await Project.findByIdAndUpdate(this.projectId, {
      status: 'researching',
      researchProgress: 5,
    });

    try {
      // Stage 1: Understand Problem
      this.setStage(job, 'understand', 'running');
      job.progress = STAGE_PROGRESS_MAP.understand;
      await job.save();

      const understandAgent = new ProblemUnderstandingAgent();
      const understanding = await understandAgent.execute({
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

      // Stage 2: Plan Queries
      this.setStage(job, 'plan', 'running');
      job.progress = STAGE_PROGRESS_MAP.plan;
      await job.save();

      const queryPlanner = new QueryPlannerAgent();
      const { queries } = await queryPlanner.execute({
        title: project.title,
        description: project.description,
        understanding,
      });

      this.setStage(job, 'plan', 'completed');
      await job.save();

      // Stage 3-5: Deep Search (Web, Papers, Code)
      this.setStage(job, 'search_web', 'running');
      this.setStage(job, 'search_papers', 'running');
      this.setStage(job, 'search_github', 'running');
      job.progress = STAGE_PROGRESS_MAP.search_github;
      await job.save();

      const deepSearch = new DeepSearchAgent();
      const { sources } = await deepSearch.execute({ queries });

      if (sources.length > 0) {
        await ResearchSource.insertMany(
          sources.map((s: NormalizedSource) => ({
            projectId: this.projectId,
            researchJobId: this.researchJobId,
            provider: s.provider,
            sourceType: s.sourceType,
            title: s.title,
            url: s.url,
            authors: s.authors,
            publishedAt: s.publishedAt ?? undefined,
            snippet: s.snippet,
            content: s.content,
            query: s.query,
            metadata: s.metadata,
            relevanceScore: s.relevanceScore,
            credibilityScore: s.credibilityScore,
          }))
        );
      }

      this.setStage(job, 'search_web', 'completed');
      this.setStage(job, 'search_papers', 'completed');
      this.setStage(job, 'search_github', 'completed');
      job.sourceCount = sources.length;
      await job.save();

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

      // Mark Job Completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.metadata = {
        queries,
        critique: criticResult,
      };
      await job.save();

      emitResearchComplete(this.projectId, {
        jobId: this.researchJobId,
        projectId: this.projectId,
        durationMs: Date.now() - (job.startedAt ? job.startedAt.getTime() : Date.now()),
      });

      logger.info(`ResearchOrchestrator completed successfully for job ${this.researchJobId}`);

      // Asynchronously trigger RAG vector indexing for retrieved research sources
      indexResearchSources(this.projectId, this.researchJobId).catch((err) => {
        logger.warn(`RAG indexing failed for project [${this.projectId}]`, {
          error: (err as Error).message,
        });
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
