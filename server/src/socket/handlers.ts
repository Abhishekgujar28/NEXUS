import { Socket } from 'socket.io';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';

const joinProjectSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

export const setupSocketHandlers = (socket: Socket): void => {
  const user = socket.data.user;
  if (!user?._id) return;

  // Auto-join user's private notification room
  const userRoom = `user:${user._id.toString()}`;
  socket.join(userRoom);
  logger.info(`Socket [${socket.id}] joined user room: ${userRoom}`);

  // Handler: Join project room with role authorization
  socket.on('project:join', async (data: unknown, callback?: (res: unknown) => void) => {
    try {
      const parsed = joinProjectSchema.safeParse(data);
      if (!parsed.success) {
        const errRes = { success: false, error: 'Invalid projectId' };
        if (callback) callback(errRes);
        socket.emit('error', errRes);
        return;
      }

      const { projectId } = parsed.data;

      // Verify project exists and is not deleted
      const project = await Project.findById(projectId).select('_id userId status');
      if (!project || project.status === 'deleted') {
        const errRes = { success: false, error: 'Project not found' };
        if (callback) callback(errRes);
        socket.emit('error', errRes);
        return;
      }

      // Check authorization (Owner or Member)
      const isOwner = project.userId.toString() === user._id.toString();
      let isMember = false;

      if (!isOwner) {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId: user._id,
        });
        isMember = Boolean(membership);
      }

      if (!isOwner && !isMember) {
        const errRes = { success: false, error: 'Insufficient project permissions' };
        if (callback) callback(errRes);
        socket.emit('error', errRes);
        return;
      }

      const roomName = `project:${projectId}`;
      socket.join(roomName);
      logger.debug(`Socket [${socket.id}] (User ${user._id}) joined room: ${roomName}`);

      const successRes = { success: true, data: { room: roomName, projectId } };
      if (callback) callback(successRes);
      socket.emit('project:joined', { projectId, room: roomName });
    } catch (err) {
      logger.error(`Error in project:join handler for socket [${socket.id}]`, {
        error: (err as Error).message,
      });
      const errRes = { success: false, error: 'Failed to join project room' };
      if (callback) callback(errRes);
      socket.emit('error', errRes);
    }
  });

  // Handler: Leave project room
  socket.on('project:leave', (data: unknown, callback?: (res: unknown) => void) => {
    try {
      const parsed = joinProjectSchema.safeParse(data);
      if (!parsed.success) return;

      const { projectId } = parsed.data;
      const roomName = `project:${projectId}`;

      socket.leave(roomName);
      logger.debug(`Socket [${socket.id}] left room: ${roomName}`);

      const successRes = { success: true, data: { room: roomName, projectId } };
      if (callback) callback(successRes);
      socket.emit('project:left', { projectId, room: roomName });
    } catch (err) {
      logger.error(`Error in project:leave handler for socket [${socket.id}]`, {
        error: (err as Error).message,
      });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Socket [${socket.id}] disconnected: ${reason}`);
  });
};
