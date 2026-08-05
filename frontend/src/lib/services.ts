import { api, unwrap } from './api';
import type {
  ApiEnvelope,
  CopilotMessage,
  EvidenceClaim,
  ExistingSolution,
  ID,
  InnovationGap,
  PagedResult,
  Project,
  ProjectArchitecture,
  ProjectRecommendation,
  ProjectStats,
  ResearchJob,
  ResearchSource,
  Roadmap,
  ResourceRecommendation,
  User,
} from '@/types';

/* -------- Auth -------- */
interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  register: (body: { name: string; email: string; password: string }) =>
    unwrap<AuthPayload>(api.post<ApiEnvelope<AuthPayload>>('/auth/register', body)),
  login: (body: { email: string; password: string }) =>
    unwrap<AuthPayload>(api.post<ApiEnvelope<AuthPayload>>('/auth/login', body)),
  logout: (refreshToken: string | null) =>
    api.post<ApiEnvelope<{ message: string }>>('/auth/logout', { refreshToken }),
  me: () => unwrap<{ user: User }>(api.get<ApiEnvelope<{ user: User }>>('/auth/me')),
};

/* -------- Projects -------- */
export const projectsService = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    unwrap<PagedResult<Project>>(
      api.get<ApiEnvelope<PagedResult<Project>>>('/projects', { params })
    ),
  get: (id: ID) => unwrap<Project>(api.get<ApiEnvelope<Project>>(`/projects/${id}`)),
  create: (body: Partial<Project> & { title: string; description: string }) =>
    unwrap<Project>(api.post<ApiEnvelope<Project>>('/projects', body)),
  update: (id: ID, body: Partial<Project>) =>
    unwrap<Project>(api.put<ApiEnvelope<Project>>(`/projects/${id}`, body)),
  remove: (id: ID) =>
    unwrap<{ id: ID; status: string }>(
      api.delete<ApiEnvelope<{ id: ID; status: string }>>(`/projects/${id}`)
    ),
  stats: (id: ID) =>
    unwrap<ProjectStats>(api.get<ApiEnvelope<ProjectStats>>(`/projects/${id}/stats`)),
  addMember: (id: ID, body: { email: string; role?: 'owner' | 'editor' | 'viewer' }) =>
    unwrap(api.post<ApiEnvelope<unknown>>(`/projects/${id}/members`, body)),
  removeMember: (id: ID, userId: ID) =>
    unwrap(api.delete<ApiEnvelope<unknown>>(`/projects/${id}/members/${userId}`)),
};

/* -------- Research -------- */
export const researchService = {
  start: (projectId: ID) =>
    unwrap<{ jobId: ID; status: string }>(
      api.post<ApiEnvelope<{ jobId: ID; status: string }>>(`/research/${projectId}/start`, {})
    ),
  job: (projectId: ID) =>
    unwrap<ResearchJob>(api.get<ApiEnvelope<ResearchJob>>(`/research/${projectId}/job`)),
  sources: (projectId: ID, params?: { page?: number; limit?: number; type?: string }) =>
    unwrap<PagedResult<ResearchSource>>(
      api.get<ApiEnvelope<PagedResult<ResearchSource>>>(`/research/${projectId}/sources`, {
        params,
      })
    ),
  evidence: (projectId: ID) =>
    unwrap<EvidenceClaim[]>(
      api.get<ApiEnvelope<EvidenceClaim[]>>(`/research/${projectId}/evidence`)
    ),
  solutions: (projectId: ID) =>
    unwrap<ExistingSolution[]>(
      api.get<ApiEnvelope<ExistingSolution[]>>(`/research/${projectId}/solutions`)
    ),
  gaps: (projectId: ID) =>
    unwrap<InnovationGap[]>(api.get<ApiEnvelope<InnovationGap[]>>(`/research/${projectId}/gaps`)),
  architecture: (projectId: ID) =>
    unwrap<{
      architecture: ProjectArchitecture | null;
      recommendations: ProjectRecommendation[];
      preferredTech?: string | null;
      constraints?: string | null;
    }>(api.get(`/research/${projectId}/architecture`)),
  resources: (projectId: ID) =>
    unwrap<{ resources: ResourceRecommendation[] }>(
      api.get(`/research/${projectId}/resources`)
    ),
  roadmap: (projectId: ID) =>
    unwrap<{ roadmap: Roadmap | null }>(api.get(`/research/${projectId}/roadmap`)),
  stressTest: (projectId: ID) =>
    unwrap(api.post(`/research/${projectId}/stresstest`, {})),
};

/* -------- Copilot -------- */
export const copilotService = {
  chat: (projectId: ID, message: string, conversationId?: string) =>
    unwrap<{ conversationId: string; answer: string; citations: Array<{ index: number; title: string; url: string; sourceType: string }> }>(
      api.post<ApiEnvelope<{ conversationId: string; answer: string; citations: Array<{ index: number; title: string; url: string; sourceType: string }> }>>(
        `/copilot/${projectId}/chat`,
        { message, conversationId }
      )
    ),
  history: (projectId: ID, conversationId?: ID) =>
    unwrap<{ projectId: ID; conversationId: ID | null; messages: CopilotMessage[] }>(
      api.get<ApiEnvelope<{ projectId: ID; conversationId: ID | null; messages: CopilotMessage[] }>>(
        `/copilot/${projectId}/history`, { params: conversationId ? { conversationId } : undefined }
      )
    ),
};
