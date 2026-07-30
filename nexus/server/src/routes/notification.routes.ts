import { Router } from 'express';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(verifyAuth);

router.get('/', asyncHandler(listNotifications));
router.put('/:id/read', asyncHandler(markNotificationRead));
router.put('/read-all', asyncHandler(markAllNotificationsRead));

export default router;
