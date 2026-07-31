import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '@/lib/socket';

export interface ResearchProgressPayload {
  jobId: string;
  stage: string;
  stageLabel: string;
  progress: number;
  message?: string;
}

export interface ResearchCompletePayload {
  jobId: string;
  projectId: string;
  durationMs?: number;
}

export interface ResearchFailedPayload {
  jobId: string;
  projectId: string;
  error?: string;
}

export function useResearchSocket(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    joinProjectRoom(projectId);
    const socket = getSocket();

    const onProgress = (data: ResearchProgressPayload) => {
      qc.invalidateQueries({ queryKey: ['research-job', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    };

    const onComplete = (data: ResearchCompletePayload) => {
      toast.success('Research completed successfully');
      qc.invalidateQueries({ queryKey: ['research-job', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['sources', projectId] });
      qc.invalidateQueries({ queryKey: ['evidence', projectId] });
      qc.invalidateQueries({ queryKey: ['solutions', projectId] });
      qc.invalidateQueries({ queryKey: ['gaps', projectId] });
      qc.invalidateQueries({ queryKey: ['architecture', projectId] });
      qc.invalidateQueries({ queryKey: ['resources', projectId] });
      qc.invalidateQueries({ queryKey: ['roadmap', projectId] });
    };

    const onFailed = (data: ResearchFailedPayload) => {
      toast.error(data.error || 'Research execution failed');
      qc.invalidateQueries({ queryKey: ['research-job', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    };

    socket.on('research:progress', onProgress);
    socket.on('research:complete', onComplete);
    socket.on('research:failed', onFailed);

    return () => {
      socket.off('research:progress', onProgress);
      socket.off('research:complete', onComplete);
      socket.off('research:failed', onFailed);
      leaveProjectRoom(projectId);
    };
  }, [projectId, qc]);
}
