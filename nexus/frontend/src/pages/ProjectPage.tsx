import { useParams, useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Microscope,
  BookOpen,
  Scale,
  Lightbulb,
  ShieldAlert,
  Boxes,
  FolderOpen,
  Map,
  MessageSquare,
  Play,
  Loader2,
  AlertTriangle,
  Package,
  Hammer,
} from 'lucide-react';
import { projectsService, researchService } from '@/lib/services';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import { OverviewTab } from '@/features/project/OverviewTab';
import { ResearchProgressTab } from '@/features/project/ResearchProgressTab';
import { SourcesTab } from '@/features/project/SourcesTab';
import { EvidenceTab } from '@/features/project/EvidenceTab';
import { SolutionsTab } from '@/features/project/SolutionsTab';
import { GapsTab } from '@/features/project/GapsTab';
import { StressTestTab } from '@/features/project/StressTestTab';
import { ArchitectureTab } from '@/features/project/ArchitectureTab';
import { ResourcesTab } from '@/features/project/ResourcesTab';
import { RoadmapTab } from '@/features/project/RoadmapTab';
import { CopilotTab } from '@/features/project/CopilotTab';
import { BuildModeTab } from '@/features/project/BuildModeTab';
import { useResearchSocket } from '@/hooks/useResearchSocket';

const TABS = [
  { key: '', label: 'Overview', icon: BookOpen },
  { key: 'research', label: 'Research', icon: Microscope },
  { key: 'sources', label: 'Sources', icon: FolderOpen },
  { key: 'evidence', label: 'Evidence', icon: Scale },
  { key: 'solutions', label: 'Solutions', icon: Lightbulb },
  { key: 'gaps', label: 'Gaps', icon: ShieldAlert },
  { key: 'stress', label: 'Stress Test', icon: AlertTriangle },
  { key: 'architecture', label: 'Architecture', icon: Boxes },
  { key: 'resources', label: 'Resources', icon: Package },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
  { key: 'build', label: 'Build', icon: Hammer },
  { key: 'copilot', label: 'Copilot', icon: MessageSquare },
] as const;

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const basePath = `/projects/${projectId}`;
  const activeTab = location.pathname.replace(basePath, '').replace(/^\//, '') || '';

  useResearchSocket(projectId);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectsService.stats(projectId!),
    enabled: !!projectId,
    refetchInterval: project?.status === 'researching' ? 5000 : false,
  });

  const startResearch = useMutation({
    mutationFn: () => researchService.start(projectId!),
    onSuccess: () => {
      toast.success('Research started');
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      navigate(`${basePath}/research`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full max-w-3xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const isResearching = project.status === 'researching';
  const canStartResearch = project.status === 'draft' || project.status === 'complete' || project.status === 'failed';

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Project header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-lg font-semibold text-foreground tracking-tight truncate">
              {project.title}
            </h1>
            <Badge
              tone={
                project.status === 'researching'
                  ? 'accent'
                  : project.status === 'complete'
                  ? 'success'
                  : project.status === 'failed'
                  ? 'danger'
                  : 'neutral'
              }
            >
              {project.status === 'researching' ? 'Researching' : project.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          {isResearching && (
            <div className="flex items-center gap-3 mt-3 max-w-md">
              <Progress value={project.researchProgress} className="flex-1" />
              <span className="text-xs tabular text-muted-foreground">{project.researchProgress}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canStartResearch && (
            <Button
              variant="primary"
              size="md"
              onClick={() => startResearch.mutate()}
              loading={startResearch.isPending}
            >
              <Play className="h-3.5 w-3.5" />
              {project.status === 'draft' ? 'Start Research' : 'Re-run Research'}
            </Button>
          )}
          {isResearching && (
            <div className="flex items-center gap-2 text-xs text-citrine-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <nav className="flex items-stretch gap-0.5 border-b border-border mb-6 overflow-x-auto no-scrollbar -mx-6 px-6">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => navigate(key ? `${basePath}/${key}` : basePath)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px',
                isActive
                  ? 'border-citrine-400 text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <Routes>
        <Route index element={<OverviewTab project={project} stats={stats ?? null} />} />
        <Route path="research" element={<ResearchProgressTab projectId={project._id} />} />
        <Route path="sources" element={<SourcesTab projectId={project._id} />} />
        <Route path="evidence" element={<EvidenceTab projectId={project._id} />} />
        <Route path="solutions" element={<SolutionsTab projectId={project._id} />} />
        <Route path="gaps" element={<GapsTab projectId={project._id} />} />
        <Route path="stress" element={<StressTestTab projectId={project._id} />} />
        <Route path="architecture" element={<ArchitectureTab projectId={project._id} />} />
        <Route path="resources" element={<ResourcesTab projectId={project._id} />} />
        <Route path="roadmap" element={<RoadmapTab projectId={project._id} />} />
        <Route path="build" element={<BuildModeTab projectId={project._id} />} />
        <Route path="copilot" element={<CopilotTab project={project} />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  );
}
