import { useSearchParams } from 'react-router-dom';
import { Boxes, Package, Map, ListChecks } from 'lucide-react';
import type { ID } from '@/types';
import { Segmented, type SegmentedItem } from '@/components/shared/Segmented';
import { ArchitectureTab } from './ArchitectureTab';
import { ResourcesTab } from './ResourcesTab';
import { RoadmapTab } from './RoadmapTab';
import { BuildModeTab } from './BuildModeTab';

const ITEMS: SegmentedItem[] = [
  { value: 'architecture', label: 'Architecture', icon: Boxes },
  { value: 'resources', label: 'Resources', icon: Package },
  { value: 'roadmap', label: 'Roadmap', icon: Map },
  { value: 'tasks', label: 'Tasks', icon: ListChecks },
];

/**
 * BuildView — groups the proposed Architecture, curated Resources, delivery
 * Roadmap, and the interactive build Tasks workspace behind one segmented
 * control. Section is URL-synced via `?view=`.
 */
export function BuildView({ projectId }: { projectId: ID }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? 'architecture';

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
      {view === 'architecture' && <ArchitectureTab projectId={projectId} />}
      {view === 'resources' && <ResourcesTab projectId={projectId} />}
      {view === 'roadmap' && <RoadmapTab projectId={projectId} />}
      {view === 'tasks' && <BuildModeTab projectId={projectId} />}
    </div>
  );
}
