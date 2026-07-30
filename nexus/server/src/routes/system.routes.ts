import { Router } from 'express';
import {
  getProviderStatus,
  getAIConfig,
  updateProviderSettings,
} from '../controllers/system.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/providers', asyncHandler(getProviderStatus));
router.get('/ai-config', asyncHandler(getAIConfig));
router.patch('/providers', asyncHandler(updateProviderSettings));

export default router;
