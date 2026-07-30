import { Request, Response } from 'express';
import Project from '../models/Project.js';
import Conversation from '../models/Conversation.js';
import { CopilotAgent } from '../agents/copilot.agent.js';
import { assembleRagContext } from '../rag/pipeline.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { config } from '../core/config.js';

const assertProjectExists = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId).select('_id status');
  if (!project || project.status === 'deleted') {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }
};

export const chatWithCopilot = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await assertProjectExists(projectId);

  const { message, conversationId } = req.body as { message: string; conversationId?: string };
  if (!message?.trim()) {
    throw new AppError('Message is required', 400, ErrorCodes.VALIDATION_ERROR);
  }

  const project = await Project.findById(projectId).select('title description domain');
  if (!project) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  // 1. Retrieve or initialize conversation record
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, projectId, userId });
    if (!conversation) {
      throw new AppError('Conversation not found', 404, ErrorCodes.NOT_FOUND);
    }
  } else {
    conversation = await Conversation.create({
      projectId,
      userId,
      title: message.slice(0, 50),
      messages: [],
    });
  }

  // 2. Build multi-turn history window
  const historyWindow = config.copilot.historyWindow;
  const recentMessages = conversation.messages.slice(-historyWindow).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 3. Assemble RAG Context from research sources
  let ragContext = '';
  let citations: any[] = [];
  try {
    const ragRes = await assembleRagContext(projectId, message);
    ragContext = ragRes.context;
    citations = ragRes.citations;
  } catch (err) {
    // Graceful fallback if RAG vector search or embedding is unavailable
  }

  // 4. Invoke Copilot Agent
  const agent = new CopilotAgent();
  const { answer } = await agent.execute({
    projectTitle: project.title,
    projectDomain: project.domain ?? undefined,
    projectDescription: project.description,
    ragContext,
    conversationHistory: recentMessages,
    userQuestion: message,
  });

  // 5. Append messages to conversation history
  const now = new Date();
  conversation.messages.push({
    role: 'user',
    content: message,
    createdAt: now,
  });
  conversation.messages.push({
    role: 'assistant',
    content: answer,
    citations,
    createdAt: new Date(),
  });
  await conversation.save();

  res.json({
    success: true,
    data: {
      conversationId: conversation._id.toString(),
      answer,
      citations,
    },
  });
};

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await assertProjectExists(projectId);

  const conversations = await Conversation.find({ projectId, userId })
    .sort({ updatedAt: -1 })
    .select('_id title messages updatedAt createdAt');

  res.json({
    success: true,
    data: {
      projectId,
      conversations: conversations.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      })),
    },
  });
};

export const getCopilotHistory = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await assertProjectExists(projectId);

  const conversationId = req.query.conversationId as string | undefined;

  let query = { projectId, userId };
  if (conversationId) {
    Object.assign(query, { _id: conversationId });
  }

  const conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });

  res.json({
    success: true,
    data: {
      projectId,
      conversationId: conversation?._id?.toString() ?? null,
      messages: conversation?.messages ?? [],
    },
  });
};
