import { Request, Response } from 'express';
import Notification from '../models/Notification.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { emitToRoom } from '../socket/socket.server.js';

/**
 * Helper to create and deliver real-time notifications to a user.
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'research_complete' | 'research_failed' | 'member_added' | 'system' = 'system',
  data?: Record<string, unknown>
) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    read: false,
    data,
  });

  // Emit real-time notification over WebSocket user room
  emitToRoom(`user:${userId}`, 'notification:new', {
    id: notification._id.toString(),
    title,
    message,
    type,
    data,
    createdAt: notification.createdAt,
  });

  return notification;
};

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  const { read } = req.query as { read?: string };
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { userId };
  if (read === 'true') query.read = true;
  if (read === 'false') query.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, read: false }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((item) => ({
        _id: item._id.toString(),
        title: item.title,
        message: item.message,
        type: item.type,
        read: item.read,
        data: item.data,
        createdAt: item.createdAt,
      })),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  const notificationId = req.params.id;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: {
      _id: notification._id.toString(),
      read: true,
    },
  });
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await Notification.updateMany({ userId, read: false }, { read: true });

  res.json({
    success: true,
    data: {
      message: 'All notifications marked as read',
    },
  });
};
