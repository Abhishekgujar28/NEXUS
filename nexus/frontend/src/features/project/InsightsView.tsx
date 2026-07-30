import { useSearchParams } from 'react-router-dom';
import { Lightbulb, GitPullRequestArrow, ShieldAlert } from 'lucide-react';
import type { ID } from '@/types';
import { Segmented, type SegmentedItem } from '@/components/shared/Segmented';
import { SolutionsTab } from './SolutionsTab';
import { GapsTab } from './GapsTab';
import { StressTestTab } from './StressTestTab';

const ITEMS: SegmentedItem[] = [
  { value: 'solutions', label: 'Solutions', icon: Lightbulb },
  { value: 'gaps', label: 'Gaps', icon: GitPullRequestArrow },
  { value: 'stress', label: 'Stress Test', icon: ShieldAlert },
];

/**
 * InsightsView — groups synthesized Solutions, open Gaps, and the adversarial
 * Stress Test behind one segmented control. Section is URL-synced via `?view=`.
 */
export function InsightsView({ projectId }: { projectId: ID }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? 'solutions';

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
      {view === 'solutions' && <SolutionsTab projectId={projectId} />}
      {view === 'gaps' && <GapsTab projectId={projectId} />}
      {view === 'stress' && <StressTestTab projectId={projectId} />}
    </div>
  );
}
