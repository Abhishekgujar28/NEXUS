import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

export interface PipelineStageItem {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  agent?: string;
  durationMs?: number;
}

export const STAGES_LIST: Array<{ key: string; label: string }> = [
  { key: 'understand', label: 'Understand Scope' },
  { key: 'plan', label: 'Query Planning' },
  { key: 'search', label: 'Searching Sources' },
  { key: 'analyze', label: 'Analyze Claims' },
  { key: 'solutions', label: 'Competitor Solutions' },
  { key: 'gaps', label: 'Gap Discovery' },
  { key: 'stress', label: 'Stress Testing' },
  { key: 'architecture', label: 'System Architecture' },
  { key: 'roadmap', label: 'Execution Roadmap' },
];

interface PipelineStepperProps {
  currentStageKey?: string;
  completedKeys?: string[];
  progress?: number;
}

export function PipelineStepper({
  currentStageKey = 'understand',
  completedKeys = [],
  progress = 0,
}: PipelineStepperProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Autonomous Research Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            9-Stage multi-agent orchestration engine
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-citrine-400">{progress}%</span>
          <div className="text-[10px] text-muted-foreground">Overall Progress</div>
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 pt-2">
        {STAGES_LIST.map((stage, idx) => {
          const isDone = completedKeys.includes(stage.key) || progress === 100;
          const isCurrent = currentStageKey === stage.key && !isDone;

          return (
            <div
              key={stage.key}
              className={`flex flex-col items-center rounded-lg p-2 text-center transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : isCurrent
                  ? 'bg-citrine-400/10 border border-citrine-400 text-citrine-400 shadow-sm'
                  : 'bg-muted/30 border border-border text-muted-foreground'
              }`}
            >
              <div className="mb-1.5">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin text-citrine-400" />
                ) : (
                  <Circle className="h-4 w-4 opacity-40" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight line-clamp-2">
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
