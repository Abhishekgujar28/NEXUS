import { Router } from 'express';
import {
  getArchitecture,
  getEvidence,
  getGaps,
  getResearchJob,
  getResearchSources,
  getResources,
  getRoadmap,
  getSolutions,
  previewResearchSources,
  startResearch,
  stressTestResearch,
  testAgent,
} from '../controllers/research.controller.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { projectAuth } from '../middleware/projectAuth.js';
import { researchLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  previewResearchSchema,
  startResearchSchema,
  testAgentSchema,
} from '../schemas/research.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.use(verifyAuth, projectAuth('viewer'), researchLimiter);

// Mutations require at least editor; read endpoints only need viewer.
router.post('/start', projectAuth('editor'), validate(startResearchSchema), asyncHandler(startResearch));
router.post('/preview', projectAuth('editor'), validate(previewResearchSchema), asyncHandler(previewResearchSources));
router.post('/test-agent', projectAuth('editor'), validate(testAgentSchema), asyncHandler(testAgent));
router.get('/job', asyncHandler(getResearchJob));
router.get('/sources', asyncHandler(getResearchSources));
router.get('/evidence', asyncHandler(getEvidence));
router.get('/solutions', asyncHandler(getSolutions));
router.get('/gaps', asyncHandler(getGaps));
router.get('/architecture', asyncHandler(getArchitecture));
router.get('/resources', asyncHandler(getResources));
router.get('/roadmap', asyncHandler(getRoadmap));
router.post('/stresstest', projectAuth('editor'), asyncHandler(stressTestResearch));

export default router;
