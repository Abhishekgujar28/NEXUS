import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { setupSocketHandlers } from './handlers.js';

let io: SocketIOServer | null = null;

export interface SocketUser {
  _id: string;
  email: string;
  name?: string;
}

declare module 'socket.io' {
  interface SocketData {
    user: SocketUser;
  }
}

/**
 * Socket.io Authentication Middleware.
 * Extracts JWT token from handshake auth or headers, verifies user identity, and attaches to socket.data.
 */
const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
  try {
    let token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined);

    if (!token) {
      return next(new Error('Authentication required'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('_id email name');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.data.user = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    logger.warn(`Socket authentication failed for socket [${socket.id}]`, {
      error: (err as Error).message,
    });
    next(new Error('Invalid or expired authentication token'));
  }
};

/**
 * Initialize Socket.io server and attach to HTTP server instance.
 */
export const createSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    socketAuthMiddleware(socket, next).catch((err) => next(err as Error));
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.data.user?._id})`);
    setupSocketHandlers(socket);
  });

  logger.info('Socket.io server initialized');
  return io;
};

/**
 * Return current SocketIOServer instance (or null if not initialized).
 */
export const getIO = (): SocketIOServer | null => io;

/**
 * Emit event to a specific room (e.g. project:projectId or user:userId).
 */
export const emitToRoom = (room: string, event: string, payload: unknown): void => {
  if (!io) {
    logger.debug(`Socket.io not initialized; skipped emitting event [${event}] to room [${room}]`);
    return;
  }
  io.to(room).emit(event, payload);
};

export const emitToProject = (projectId: string, event: string, payload: unknown): void => {
  emitToRoom(`project:${projectId}`, event, payload);
};

/**
 * Emit research progress update to project room.
 */
export const emitResearchProgress = (
  projectId: string,
  payload: {
    jobId: string;
    stage: string;
    stageLabel: string;
    progress: number;
    message: string;
  }
): void => {
  emitToRoom(`project:${projectId}`, 'research:progress', payload);
};

/**
 * Emit research complete event to project room.
 */
export const emitResearchComplete = (
  projectId: string,
  payload: {
    jobId: string;
    projectId: string;
    durationMs?: number;
  }
): void => {
  emitToRoom(`project:${projectId}`, 'research:complete', payload);
};

/**
 * Emit research failed event to project room.
 */
export const emitResearchFailed = (
  projectId: string,
  payload: {
    jobId: string;
    projectId: string;
    error: string;
  }
): void => {
  emitToRoom(`project:${projectId}`, 'research:failed', payload);
};

/**
 * Emit a batch of sources as soon as a single provider completes, so the
 * frontend can render results incrementally instead of waiting for the slowest
 * provider. Carries the provider's status + latency + count alongside the
 * normalized sources themselves.
 */
export const emitResearchSources = (
  projectId: string,
  payload: {
    jobId: string;
    provider: string;
    status: 'fulfilled' | 'failed' | 'skipped';
    count: number;
    latencyMs: number;
    optional: boolean;
    error?: string;
    sources: unknown[];
  }
): void => {
  emitToRoom(`project:${projectId}`, 'research:sources', payload);
};

/**
 * Emit the end-of-job provider health summary (per-provider status, latency and
 * result counts) so the frontend can render a resilience/diagnostics panel.
 */
export const emitProviderHealth = (
  projectId: string,
  payload: {
    jobId: string;
    projectId: string;
    providers: Array<{
      provider: string;
      status: 'fulfilled' | 'failed' | 'skipped';
      count: number;
      latencyMs: number;
      optional: boolean;
      error?: string;
    }>;
  }
): void => {
  emitToRoom(`project:${projectId}`, 'research:provider-health', payload);
};
