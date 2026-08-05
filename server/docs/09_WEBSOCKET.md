# 09 — WebSocket Layer

> **Scope:** Socket.io server architecture — authenticated connections, room management, research progress events, copilot streaming, and reconnection strategy.

---

## 1. Purpose

Define the real-time communication layer for NEXUS. WebSockets deliver research pipeline progress, copilot token streaming, and notification events to connected clients without polling. Any implementation of the WebSocket layer MUST conform to this specification.

**Status:** Socket.io is installed as a dependency (`socket.io` 4.7.5) but is **not yet implemented**. This document defines the complete specification.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `[PLANNED] socket/socket.server.ts` | Socket.io server creation, auth middleware, room logic |
| `[PLANNED] socket/handlers.ts` | Event handlers for each namespace/event type |
| `server.ts` | HTTP server creation (Socket.io attaches here) |
| `middleware/auth.middleware.ts` | JWT verification logic (reused for socket auth) |
| `[PLANNED] orchestrator/` | Emits progress events during research |
| `[PLANNED] copilot.agent.ts` | Emits token-by-token streaming |

---

## 3. Folder Mapping (Planned)

```
src/socket/
├── socket.server.ts    # createSocketServer(httpServer), auth, rooms
└── handlers.ts         # joinProject, leaveProject, progress, copilot events
```

---

## 4. Server Architecture

### 4.1 Initialization

```
server.ts:
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);

socket.server.ts:
  export const createSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
      cors: {
        origin: config.frontendUrl,
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.use(socketAuthMiddleware);   // JWT verification
    io.on('connection', onConnection);

    return io;
  };
```

### 4.2 Authentication Middleware

```
socketAuthMiddleware(socket, next):
  1. Extract token from socket.handshake.auth.token
     OR socket.handshake.headers.authorization
  2. jwt.verify(token, JWT_SECRET)
  3. User.findById(decoded.userId)
  4. socket.data.user = { _id, email, name }
  5. next()

  On failure: next(new Error('Authentication required'))
```

**Sequence Diagram:**
```
Client                    Socket.io Server              MongoDB
  │                            │                           │
  │  io.connect({              │                           │
  │    auth: { token: JWT }    │                           │
  │  })                        │                           │
  │───────────────────────────►│                           │
  │                            │ socketAuthMiddleware      │
  │                            │ jwt.verify(token)         │
  │                            │                           │
  │                            │ User.findById(userId)     │
  │                            │──────────────────────────►│
  │                            │◄──────────────────────────│
  │                            │                           │
  │                            │ socket.data.user = {...}  │
  │                            │                           │
  │  'connect' event           │                           │
  │◄───────────────────────────│                           │
```

---

## 5. Room Management

### 5.1 Room Naming Convention

| Room | Format | Purpose |
|---|---|---|
| Project room | `project:{projectId}` | Research progress + notifications |
| User room | `user:{userId}` | Personal notifications |

### 5.2 Join/Leave Project Room

```
Client emits: 'project:join' { projectId }
Server:
  1. Verify user has access (viewer+ role) to project
  2. socket.join(`project:${projectId}`)
  3. Acknowledge: emit 'project:joined' { projectId }

Client emits: 'project:leave' { projectId }
Server:
  1. socket.leave(`project:${projectId}`)
  2. Acknowledge: emit 'project:left' { projectId }
```

### 5.3 Auto-Join User Room

```
On connection:
  socket.join(`user:${socket.data.user._id}`)
```

---

## 6. Event Specifications

### 6.1 Research Progress Events

**Direction:** Server → Client  
**Room:** `project:{projectId}`

| Event | Payload | When |
|---|---|---|
| `research:progress` | `{ jobId, stage, stageLabel, progress, message }` | Each stage starts/completes |
| `research:stage:start` | `{ jobId, stageKey, stageLabel }` | Agent begins execution |
| `research:stage:complete` | `{ jobId, stageKey, stageLabel, durationMs }` | Agent finishes |
| `research:stage:failed` | `{ jobId, stageKey, error }` | Agent fails |
| `research:complete` | `{ jobId, projectId, duration }` | Pipeline completes |
| `research:failed` | `{ jobId, projectId, error }` | Pipeline fails |

**Sequence Diagram:**
```
BullMQ Worker          Socket.io Server           Connected Clients
     │                       │                          │
     │ (stage 1 starts)      │                          │
     │ emit('research:progress', {                      │
     │   stage: 'understand',│                          │
     │   progress: 5         │                          │
     │ })                    │                          │
     │──────────────────────►│                          │
     │                       │  io.to('project:123')    │
     │                       │  .emit('research:progress')
     │                       │─────────────────────────►│
     │                       │                          │
     │ (stage 1 completes)   │                          │
     │ emit('research:stage:complete')                  │
     │──────────────────────►│                          │
     │                       │─────────────────────────►│
     │                       │                          │
     │  ... (stages 2-11)    │                          │
     │                       │                          │
     │ (pipeline completes)  │                          │
     │ emit('research:complete')                        │
     │──────────────────────►│                          │
     │                       │─────────────────────────►│
```

### 6.2 Copilot Streaming Events

**Direction:** Server → Client  
**Room:** `project:{projectId}` (scoped to requesting user via `socket.id`)

| Event | Payload | When |
|---|---|---|
| `copilot:start` | `{ conversationId }` | Generation begins |
| `copilot:token` | `{ conversationId, token, index }` | Each generated token |
| `copilot:complete` | `{ conversationId, fullResponse, citations }` | Generation finishes |
| `copilot:error` | `{ conversationId, error }` | Generation fails |

### 6.3 Notification Events

**Direction:** Server → Client  
**Room:** `user:{userId}`

| Event | Payload | When |
|---|---|---|
| `notification:new` | `{ id, type, title, message, data }` | New notification created |
| `notification:count` | `{ unread: number }` | Unread count changes |

### 6.4 Client → Server Events

| Event | Payload | Handler |
|---|---|---|
| `project:join` | `{ projectId }` | Join project room |
| `project:leave` | `{ projectId }` | Leave project room |
| `copilot:cancel` | `{ conversationId }` | Cancel generation |

---

## 7. Error Handling

| Error | Handling |
|---|---|
| Invalid/expired JWT | Socket disconnected with error message |
| User not found | Socket disconnected |
| Join unauthorized project | Error event sent, room not joined |
| Socket disconnect during research | Research continues (background) — client reconnects |
| Socket disconnect during copilot | Generation may continue; result stored in Conversation |

---

## 8. Reconnection Strategy

```
Client-side (socket.io-client):
  const socket = io(SERVER_URL, {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000
  });

  socket.on('connect', () => {
    // Re-join project rooms
    activeProjectIds.forEach(id =>
      socket.emit('project:join', { projectId: id })
    );
  });

  socket.on('connect_error', (err) => {
    if (err.message === 'Authentication required') {
      // Refresh access token, then reconnect
      refreshToken().then(newToken => {
        socket.auth.token = newToken;
        socket.connect();
      });
    }
  });
```

---

## 9. Worker ↔ Socket.io Communication

The BullMQ worker runs in a separate process. It communicates with the Socket.io server through Redis pub/sub:

```
Worker Process                Redis                Socket.io Process
     │                          │                        │
     │ redis.publish(           │                        │
     │   'nexus:events',        │                        │
     │   JSON.stringify(event)  │                        │
     │ )                        │                        │
     │─────────────────────────►│                        │
     │                          │ redis.subscribe(       │
     │                          │   'nexus:events'       │
     │                          │ )                      │
     │                          │───────────────────────►│
     │                          │                        │
     │                          │                        │ io.to(room)
     │                          │                        │ .emit(event)
```

Alternative: If running in the same process, use an `EventEmitter` singleton.

---

## 10. Security

| Concern | Mitigation |
|---|---|
| Unauthorized connections | JWT verification on handshake |
| Room snooping | Project access check before joining |
| Message injection | Server-only events (clients cannot broadcast) |
| DoS via connections | Connection rate limiting per IP |
| Token expiry | Client handles `connect_error` → refresh → reconnect |
| CORS | Same `FRONTEND_URL` origin restriction as HTTP |

---

## 11. Validation

- `project:join` validates `projectId` is a valid ObjectId
- `project:join` verifies user membership/ownership before joining room
- Event payloads are plain objects — no executable content

---

## 12. Dependencies

| Component | Depends On |
|---|---|
| `socket/socket.server.ts` | `socket.io`, `http.Server`, `jwt.ts`, `User` model |
| `socket/handlers.ts` | `Project` model, `ProjectMember` model |
| Worker events | `ioredis` (Redis pub/sub) |
| Client | `socket.io-client` |

---

## 13. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Auth: valid token | Connection accepted, user attached | P0 |
| Auth: invalid token | Connection rejected | P0 |
| Auth: expired token | Connection rejected with specific error | P0 |
| Room: join authorized | Viewer+ → room joined | P0 |
| Room: join unauthorized | Non-member → error | P0 |
| Progress events | Emitted to correct room only | P0 |
| Copilot streaming | Tokens delivered in order | P1 |
| Reconnection | Auto-rejoin rooms on reconnect | P1 |
| Cross-room isolation | Project A events not seen by Project B | P0 |
| Concurrent connections | Multiple clients in same room | P1 |

---

## 14. Future Improvements

1. **Namespace Separation**: `/research` and `/copilot` namespaces for logical isolation
2. **Presence Tracking**: Show who is online in a project
3. **Typing Indicators**: Show when copilot is generating
4. **Collaborative Editing**: Real-time project metadata co-editing
5. **Binary Events**: Efficient binary protocol for large data transfers
6. **Horizontal Scaling**: Redis adapter for multi-server Socket.io
7. **Event Replay**: Missed events delivered on reconnection
8. **Compression**: `perMessageDeflate` for bandwidth optimization
