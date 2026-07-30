import { Request, Response } from 'express';
import Project from '../models/Project.js';
import { aiProvider } from '../integrations/gemini.js';
import { AppError, ErrorCodes } from '../core/errors.js';

const assertProjectExists = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId).select('_id status');
  if (!project || project.status === 'deleted') {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }
};

export const chatWithCopilot = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await assertProjectExists(projectId);

  const { message, conversationId } = req.body as { message: string; conversationId?: string };
  if (!message?.trim()) {
    throw new AppError('Message is required', 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (!aiProvider.isConfigured()) {
    throw new AppError('Copilot provider is not configured', 503, ErrorCodes.BAD_GATEWAY);
  }

  const project = await Project.findById(projectId).select('title description domain problemUnderstanding');
  const prompt = [
    `Project title: ${project?.title ?? ''}`,
    `Project domain: ${project?.domain ?? ''}`,
    `Project description: ${project?.description ?? ''}`,
    `User question: ${message}`,
  ].join('\n');

  const answer = await aiProvider.generate(prompt);
  res.json({
    success: true,
    data: {
      conversationId: conversationId ?? `project-${projectId}`,
      answer,
    },
  });
};

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await assertProjectExists(projectId);

  res.json({
    success: true,
    data: {
      projectId,
      conversations: [],
    },
  });
};

export const getCopilotHistory = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await assertProjectExists(projectId);

  res.json({
    success: true,
    data: {
      projectId,
      items: [],
    },
  });
};
