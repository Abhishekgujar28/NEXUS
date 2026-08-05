import { useState } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type DiagramViewType =
  | 'flowchart'
  | 'sequence'
  | 'er'
  | 'component'
  | 'class'
  | 'deployment'
  | 'infrastructure';

interface MermaidViewerProps {
  mermaidSource?: string;
  svgUrl?: string;
  pngUrl?: string;
}

const VIEWS: Array<{ key: DiagramViewType; label: string }> = [
  { key: 'flowchart', label: 'Flowchart' },
  { key: 'sequence', label: 'Sequence' },
  { key: 'er', label: 'ER Model' },
  { key: 'component', label: 'Component' },
  { key: 'class', label: 'Class Diagram' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'infrastructure', label: 'Infrastructure' },
];

export function MermaidViewer({
  mermaidSource = 'graph TD;\n  A[Client Request] --> B[API Gateway];\n  B --> C[Redis Lock];\n  C --> D[BullMQ Worker];\n  D --> E[Multi-Agent Matrix];',
  svgUrl,
  pngUrl,
}: MermaidViewerProps) {
  const [activeTab, setActiveTab] = useState<DiagramViewType>('flowchart');
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidSource);
    setCopied(true);
    toast.success('Mermaid AST source copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header Tabs & Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-3 gap-2 bg-muted/20">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {VIEWS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${activeTab === tab.key
                  ? 'bg-citrine-400 text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            AST
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="p-6 min-h-[350px] flex items-center justify-center bg-background/50 overflow-auto">
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }} className="transition-transform">
          {svgUrl ? (
            <img src={svgUrl} alt="Architecture Diagram" className="max-w-full max-h-[400px]" />
          ) : (
            <pre className="p-4 rounded-lg bg-muted/40 font-mono text-xs text-citrine-300 border border-border max-w-xl overflow-x-auto">
              {mermaidSource}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
