import { Router } from 'express';
import {
  getProviderStatus,
  getAIConfig,
  updateProviderSettings,
} from '../controllers/system.controller.js';
import { metricsExporterHandler } from '../observability/metricsExporter.js';
import { CircuitBreakerRegistry } from '../circuit-breaker/CircuitBreakerRegistry.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/providers', asyncHandler(getProviderStatus));
router.get('/ai-config', asyncHandler(getAIConfig));
router.patch('/providers', asyncHandler(updateProviderSettings));
router.get('/metrics', metricsExporterHandler);
router.get('/circuit-breakers', (_req, res) => {
  res.json({ success: true, data: CircuitBreakerRegistry.getStatus() });
});

export default router;
