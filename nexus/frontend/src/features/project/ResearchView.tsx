import { useSearchParams } from 'react-router-dom';
import { Activity, FolderOpen, Scale } from 'lucide-react';
import type { ID, ProjectStatus } from '@/types';
import { Segmented, type SegmentedItem } from '@/components/shared/Segmented';
import { ResearchProgressTab } from './ResearchProgressTab';
import { SourcesTab } from './SourcesTab';
import { EvidenceTab } from './EvidenceTab';

const ITEMS: SegmentedItem[] = [
  { value: 'progress', label: 'Progress', icon: Activity },
  { value: 'sources', label: 'Sources', icon: FolderOpen },
  { value: 'evidence', label: 'Evidence', icon: Scale },
];

/**
 * ResearchView — groups the live research pipeline, discovered Sources, and
 * extracted Evidence behind one segmented control. Defaults to Progress while
 * a job is running, otherwise Sources. Section is URL-synced via `?view=`.
 */
export function ResearchView({
  projectId,
  status,
}: {
  projectId: ID;
  status: ProjectStatus;
}) {
  const [params, setParams] = useSearchParams();
  const fallback = status === 'researching' ? 'progress' : 'sources';
  const view = params.get('view') ?? fallback;

  const setView = (v: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', v);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Segmented items={ITEMS} value={view} onChange={setView} />
      {view === 'progress' && <ResearchProgressTab projectId={projectId} />}
      {view === 'sources' && <SourcesTab projectId={projectId} />}
      {view === 'evidence' && <EvidenceTab projectId={projectId} />}
    </div>
  );
}
