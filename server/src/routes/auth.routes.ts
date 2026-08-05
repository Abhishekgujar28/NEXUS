import { Router } from 'express';
import { login, logout, me, refresh, register } from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schema.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', verifyAuth, asyncHandler(logout));
router.post('/refresh', authLimiter, validate(refreshSchema), asyncHandler(refresh));
router.get('/me', verifyAuth, asyncHandler(me));

export default router;
