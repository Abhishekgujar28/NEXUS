import { io, type Socket } from 'socket.io-client';
import { loadTokens } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket: Socket | null = null;
let activeProjectRoom: string | null = null;

/**
 * Lazy singleton socket connection. Reused across the app so listeners
 * attached in different components share a single upstream connection.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  const { accessToken } = loadTokens();
  socket = io(SOCKET_URL || window.location.origin, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
    withCredentials: true,
  });

  socket.on('connect', () => {
    if (activeProjectRoom && socket) {
      socket.emit('project:join', { projectId: activeProjectRoom });
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeProjectRoom = null;
  }
}

export function joinProjectRoom(projectId: string): void {
  activeProjectRoom = projectId;
  const s = getSocket();
  if (s.connected) {
    s.emit('project:join', { projectId });
  }
}

export function leaveProjectRoom(projectId: string): void {
  if (activeProjectRoom === projectId) {
    activeProjectRoom = null;
  }
  const s = getSocket();
  if (s.connected) {
    s.emit('project:leave', { projectId });
  }
}
