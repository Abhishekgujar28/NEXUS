import { useState } from 'react';
import { Download, FileText, Code, FileSpreadsheet, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/lib/api';

interface ExportCenterModalProps {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'json';

const FORMATS: Array<{ format: ExportFormat; title: string; desc: string; icon: any }> = [
  { format: 'pdf', title: 'Publication PDF', desc: 'Styled publication layout with diagrams', icon: FileText },
  { format: 'docx', title: 'Microsoft Word (.docx)', desc: 'Native Word document with tables & formatting', icon: FileText },
  { format: 'markdown', title: 'Markdown (.md)', desc: 'Developer document format for repos & docs', icon: Code },
  { format: 'html', title: 'Standalone HTML', desc: 'Self-contained styled web document', icon: FileText },
  { format: 'json', title: 'Machine JSON', desc: 'Raw structured entity payload for integrations', icon: FileSpreadsheet },
];

export function ExportCenterModal({
  projectId,
  projectTitle,
  open,
  onOpenChange,
}: ExportCenterModalProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setLoadingFormat(format);
    try {
      const response = await api.get(`/api/v1/export/${projectId}/${format}?download=true`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = format === 'markdown' ? 'md' : format;
      link.setAttribute('download', `${projectId}-report.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch (err) {
      toast.error(`Export failed: ${apiErrorMessage(err)}`);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4 text-citrine-400" />
            Export Research Assets
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Download comprehensive reports and diagrams for {projectTitle}
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const isLoading = loadingFormat === f.format;
            return (
              <button
                key={f.format}
                onClick={() => handleExport(f.format)}
                disabled={!!loadingFormat}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted text-citrine-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{f.title}</div>
                    <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  {isLoading ? 'Building...' : 'Download'}
                </Button>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
