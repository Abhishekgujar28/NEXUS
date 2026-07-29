import { Router } from 'express';
import { chatWithCopilot, getCopilotHistory, listConversations } from '../controllers/copilot.controller.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { projectAuth } from '../middleware/projectAuth.js';
import { validate } from '../middleware/validate.middleware.js';
import { copilotChatSchema } from '../schemas/research.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.use(verifyAuth, projectAuth('viewer'));

router.post('/chat', validate(copilotChatSchema), asyncHandler(chatWithCopilot));
router.get('/conversations', asyncHandler(listConversations));
router.get('/history', asyncHandler(getCopilotHistory));

export default router;
