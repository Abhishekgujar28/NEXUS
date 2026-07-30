# 16 — Frontend Integration Guide

> **Scope:** Complete guide for integrating a React frontend with the NEXUS backend — API client setup, authentication flow, state management, WebSocket integration, and UI data mapping.

---

## 1. Purpose

Define exactly how the planned React frontend should interact with the NEXUS backend. This document is the contract between frontend and backend — every API call, WebSocket event, authentication header, and data transformation is specified here.

---

## 2. Technology Stack (Frontend)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | SPA with HMR |
| Routing | React Router v6 | Client-side navigation |
| State | Zustand | Lightweight global state |
| Server State | TanStack Query (React Query) | API data fetching + caching |
| HTTP Client | Axios | API requests with interceptors |
| Realtime | socket.io-client | WebSocket consumer |
| Styling | Tailwind CSS | Utility-first CSS |

---

## 3. Project Structure (Planned)

```
frontend/
├── package.json
├── vite.config.ts
├── index.html
├── public/
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Root component + router
│   ├── api/
│   │   ├── client.ts                # Axios instance + interceptors
│   │   ├── auth.api.ts              # Auth endpoint functions
│   │   ├── project.api.ts           # Project endpoint functions
│   │   ├── research.api.ts          # Research endpoint functions
│   │   └── copilot.api.ts           # Copilot endpoint functions
│   ├── stores/
│   │   ├── auth.store.ts            # User + tokens state
│   │   └── project.store.ts         # Active project state
│   ├── hooks/
│   │   ├── useAuth.ts               # Auth state + actions
│   │   ├── useProjects.ts           # React Query project hooks
│   │   ├── useResearch.ts           # React Query research hooks
│   │   ├── useCopilot.ts            # Copilot chat hook
│   │   └── useSocket.ts             # Socket.io connection hook
│   ├── services/
│   │   └── socket.ts                # Socket.io client singleton
│   ├── layouts/
│   │   ├── AppLayout.tsx            # Authenticated layout (sidebar + nav)
│   │   └── AuthLayout.tsx           # Auth pages layout
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx        # Project list
│   │   ├── ProjectPage.tsx          # Project detail + tabs
│   │   ├── ResearchPage.tsx         # Research results (sub-tabs)
│   │   └── CopilotPage.tsx          # Chat interface
│   ├── components/
│   │   ├── ui/                      # Generic UI components
│   │   ├── auth/                    # Auth forms
│   │   ├── project/                 # Project cards, forms
│   │   ├── research/                # Source/gap/solution cards
│   │   └── copilot/                 # Chat messages, input
│   └── types/
│       ├── api.types.ts             # API response types
│       ├── models.types.ts          # Data model types
│       └── socket.types.ts          # Socket event types
```

---

## 4. API Client Setup

### 4.1 Axios Instance

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 → refresh → retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newTokens = await refreshAccessToken();
        useAuthStore.getState().setTokens(newTokens);
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.2 Response Envelope Handling

All API functions should unwrap the response envelope:

```typescript
// Helper
export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  if (response.data.success) return response.data.data;
  throw new ApiError(response.data.error);
}
```

---

## 5. Authentication Integration

### 5.1 Auth Store (Zustand)

```typescript
// src/stores/auth.store.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: Tokens) => void;
  setTokens: (tokens: Tokens) => void;
  logout: () => void;
}
```

### 5.2 Token Persistence

Store tokens in `localStorage` for persistence across page reloads:
```typescript
// On login success:
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// On app mount:
const storedToken = localStorage.getItem('accessToken');
if (storedToken) {
  // Verify with GET /auth/me
  // If valid → hydrate store
  // If 401 → try refresh → if still 401 → clear storage
}
```

### 5.3 Auth Flow Sequence

```
App Loads
    │
    ▼
┌──────────────────────┐
│ Check localStorage    │
│ for accessToken       │
└──────────┬───────────┘
           │
    ┌──────▼──────┐
    │  Has token? │
    └──┬───────┬──┘
       │ Yes   │ No
       ▼       ▼
  GET /auth/me  → /login page
       │
  ┌────▼────┐
  │  200?   │
  └──┬───┬──┘
     │   │ 401
     │   ▼
     │  POST /auth/refresh
     │   (with refreshToken)
     │       │
     │  ┌────▼────┐
     │  │  200?   │
     │  └──┬───┬──┘
     │     │   │ 401
     │     ▼   ▼
     │  Update  Clear storage
     │  tokens  → /login
     ▼
  Hydrate auth store
  → Dashboard
```

---

## 6. Route Configuration

```typescript
// src/App.tsx
<Routes>
  {/* Public routes */}
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
  </Route>

  {/* Protected routes */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects/:id" element={<ProjectPage />} />
      <Route path="/projects/:id/research" element={<ResearchPage />} />
      <Route path="/projects/:id/copilot" element={<CopilotPage />} />
    </Route>
  </Route>
</Routes>
```

---

## 7. Data Fetching Patterns (React Query)

### 7.1 Project List

```typescript
// src/hooks/useProjects.ts
export function useProjects(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['projects', page, limit],
    queryFn: () => api.get(`/projects?page=${page}&limit=${limit}`).then(unwrap),
    staleTime: 30_000  // 30s cache
  });
}
```

### 7.2 Research Data

```typescript
export function useResearchJob(projectId: string) {
  return useQuery({
    queryKey: ['research', 'job', projectId],
    queryFn: () => api.get(`/research/${projectId}/job`).then(unwrap),
    refetchInterval: (data) =>
      data?.status === 'running' ? 3000 : false  // Poll while running
  });
}

export function useResearchSources(projectId: string, page = 1) {
  return useQuery({
    queryKey: ['research', 'sources', projectId, page],
    queryFn: () => api.get(`/research/${projectId}/sources?page=${page}`).then(unwrap)
  });
}
```

### 7.3 Mutations

```typescript
export function useStartResearch(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/research/${projectId}/start`).then(unwrap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'job', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}
```

---

## 8. WebSocket Integration

### 8.1 Socket.io Client

```typescript
// src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: { token: useAuthStore.getState().accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

### 8.2 Socket Hook

```typescript
// src/hooks/useSocket.ts
export function useProjectSocket(projectId: string) {
  const socket = getSocket();

  useEffect(() => {
    socket.emit('project:join', { projectId });
    return () => { socket.emit('project:leave', { projectId }); };
  }, [projectId]);

  return socket;
}
```

### 8.3 Research Progress

```typescript
// In ResearchPage.tsx
const socket = useProjectSocket(projectId);

useEffect(() => {
  const onProgress = (data: ResearchProgress) => {
    setProgress(data.progress);
    setCurrentStage(data.stage);
  };

  const onComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['research'] });
  };

  socket.on('research:progress', onProgress);
  socket.on('research:complete', onComplete);

  return () => {
    socket.off('research:progress', onProgress);
    socket.off('research:complete', onComplete);
  };
}, [socket]);
```

---

## 9. Backend ↔ Frontend Type Mapping

### 9.1 API Response Types

```typescript
// src/types/api.types.ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### 9.2 Model Types

```typescript
// src/types/models.types.ts
interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'free' | 'pro' | 'team';
}

interface Project {
  _id: string;
  title: string;
  description: string;
  userId: string;
  status: 'draft' | 'researching' | 'complete' | 'failed' | 'deleted';
  domain?: string;
  researchProgress: number;
  confidenceScore: number;
  healthScore: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ResearchJob {
  _id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stages: Stage[];
  createdAt: string;
}

interface Stage {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  note?: string;
}
```

### 9.3 Socket Event Types

```typescript
// src/types/socket.types.ts
interface ResearchProgressEvent {
  jobId: string;
  stage: string;
  stageLabel: string;
  progress: number;
  message: string;
}

interface CopilotTokenEvent {
  conversationId: string;
  token: string;
  index: number;
}
```

---

## 10. Page → Endpoint Mapping

| Page | Endpoints Used | Socket Events |
|---|---|---|
| LoginPage | `POST /auth/login` | — |
| RegisterPage | `POST /auth/register` | — |
| DashboardPage | `GET /projects`, `POST /projects` | — |
| ProjectPage | `GET /projects/:id`, `PUT /projects/:id`, `GET /projects/:id/stats` | — |
| ResearchPage | `POST /research/:id/start`, `GET /research/:id/job`, `GET /research/:id/sources|evidence|solutions|gaps|architecture|resources|roadmap` | `research:progress`, `research:complete`, `research:failed` |
| CopilotPage | `POST /copilot/:id/chat`, `GET /copilot/:id/history` | `copilot:token`, `copilot:complete` |

---

## 11. Error Handling on Frontend

```typescript
// Global error handler in API client
function handleApiError(error: AxiosError<ApiError>): never {
  const apiError = error.response?.data?.error;

  switch (apiError?.code) {
    case 'UNAUTHORIZED':
      // Already handled by interceptor (refresh → retry)
      break;
    case 'FORBIDDEN':
      toast.error('You do not have permission for this action');
      break;
    case 'NOT_FOUND':
      toast.error('Resource not found');
      break;
    case 'CONFLICT':
      toast.error(apiError.message);
      break;
    case 'VALIDATION_ERROR':
      // Map field errors to form state
      return mapValidationErrors(apiError.details);
    case 'RATE_LIMITED':
      toast.error('Too many requests. Please wait.');
      break;
    default:
      toast.error('Something went wrong');
  }

  throw error;
}
```

---

## 12. Environment Variables (Frontend)

```env
# frontend/.env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000
```

---

## 13. Security Considerations

| Concern | Frontend Handling |
|---|---|
| Token storage | `localStorage` (XSS risk — mitigate with CSP) |
| Token in requests | Axios interceptor auto-attaches `Authorization` header |
| CSRF | Not applicable (no cookies for auth currently) |
| XSS | React auto-escapes JSX; CSP headers from backend |
| Sensitive data | Never log tokens; never display passwords |
| Session expiry | Transparent token refresh via interceptor |

---

## 14. Testing Strategy

| Test | Tool | Description |
|---|---|---|
| Component unit | Vitest + Testing Library | Isolated component rendering |
| Hook unit | Vitest + renderHook | Custom hook behavior |
| Integration | Vitest + MSW | Full page with mocked API |
| E2E | Playwright or Cypress | Browser-based user flows |
| Visual regression | Storybook + Chromatic | Component appearance |

---

## 15. Future Improvements

1. **SSR/SSG**: Next.js for SEO-critical pages
2. **PWA**: Service worker for offline access
3. **Optimistic Updates**: Instant UI feedback before server confirmation
4. **Dark Mode**: System-aware theme switching
5. **i18n**: Internationalization support
6. **Accessibility**: ARIA labels, keyboard navigation, screen reader support
7. **Analytics**: User behavior tracking (PostHog, Mixpanel)
8. **Error Boundary**: React error boundaries for graceful failure
