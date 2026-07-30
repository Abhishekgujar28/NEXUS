import { Request, Response } from 'express';
import { aiRouter } from '../integrations/AIRouter.js';
import { TASK_MODEL_REGISTRY } from '../integrations/modelRegistry.js';
import { config } from '../core/config.js';

export const getProviderStatus = async (_req: Request, res: Response): Promise<void> => {
  const providerStatuses = await aiRouter.getAllProviderStatuses();

  const formatted = providerStatuses.map((p) => ({
    name: p.name,
    enabled: p.enabled,
    healthy: p.healthy,
    latency: p.latencyMs,
    models: p.models,
    ...(p.error ? { error: p.error } : {}),
  }));

  res.json({
    success: true,
    data: {
      providers: formatted,
    },
  });
};

export const getAIConfig = async (_req: Request, res: Response): Promise<void> => {
  const adminSettings = aiRouter.getAdminSettings();
  const providerStatuses = await aiRouter.getAllProviderStatuses();

  res.json({
    success: true,
    data: {
      defaultProvider: config.defaultAiProvider || 'openrouter',
      adminSettings,
      modelRegistry: TASK_MODEL_REGISTRY,
      availableModels: aiRouter.getModels(),
      providers: providerStatuses,
    },
  });
};

export const updateProviderSettings = async (req: Request, res: Response): Promise<void> => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid payload. Object expected with provider flags.' },
    });
    return;
  }

  const updatedSettings = aiRouter.updateAdminSettings(updates);

  res.json({
    success: true,
    data: {
      adminSettings: updatedSettings,
    },
  });
};
