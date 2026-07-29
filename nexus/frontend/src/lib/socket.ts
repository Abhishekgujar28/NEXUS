import { io, type Socket } from 'socket.io-client';
import { loadTokens } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket: Socket | null = null;

/**
 * Lazy singleton socket connection. Reused across the app so listeners
 * attached in different components share a single upstream connection.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  const { accessToken } = loadTokens();
  socket = io(SOCKET_URL || window.location.origin, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
    withCredentials: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProjectRoom(projectId: string): void {
  const s = getSocket();
  s.emit('project:join', { projectId });
}

export function leaveProjectRoom(projectId: string): void {
  const s = getSocket();
  s.emit('project:leave', { projectId });
}
