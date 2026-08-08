import { useState } from 'react';
import { Download, FileText, Code, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/lib/api';

interface ExportCenterModalProps {
  projectId: string;
  projectTitle: string;
  jobId?: string;
  isResearching?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'json';

const FORMATS: Array<{ format: ExportFormat; title: string; subtitle: string; desc: string; icon: any }> = [
  {
    format: 'pdf',
    title: 'Publication PDF',
    subtitle: 'Professional research report',
    desc: 'Best for sharing and presentation with styled layout & embedded diagrams',
    icon: FileText,
  },
  {
    format: 'docx',
    title: 'Microsoft Word (.docx)',
    subtitle: 'Editable research report',
    desc: 'Best for academic editing, teams, and native Word formatting',
    icon: FileText,
  },
  {
    format: 'markdown',
    title: 'Markdown (.md)',
    subtitle: 'Developer-friendly report',
    desc: 'Best for GitHub, documentation, and technical repositories',
    icon: Code,
  },
  {
    format: 'html',
    title: 'Standalone HTML',
    subtitle: 'Interactive standalone report',
    desc: 'Best for browser viewing, offline sharing, and print styling',
    icon: FileText,
  },
  {
    format: 'json',
    title: 'Machine JSON',
    subtitle: 'Complete structured research data',
    desc: 'Best for integrations, automation, vector stores, and re-import',
    icon: FileSpreadsheet,
  },
];

export function ExportCenterModal({
  projectId,
  projectTitle,
  jobId,
  isResearching,
  open,
  onOpenChange,
}: ExportCenterModalProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const [successFormats, setSuccessFormats] = useState<Record<string, boolean>>({});

  const handleExport = async (format: ExportFormat) => {
    if (loadingFormat) return; // Prevent duplicate requests
    setLoadingFormat(format);

    try {
      // api instance has baseURL set to /api/v1; use relative path /export/...
      let url = `/export/${projectId}/${format}?download=true`;
      if (jobId) {
        url += `&jobId=${encodeURIComponent(jobId)}`;
      }

      const response = await api.get(url, {
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

      setSuccessFormats((prev) => ({ ...prev, [format]: true }));
      toast.success(`Exported ${format.toUpperCase()} report successfully`);
    } catch (err: any) {
      let message = apiErrorMessage(err);
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.error?.message || parsed.message || message;
        } catch {
          // Keep default message
        }
      }
      toast.error(`Export failed: ${message}`);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4 text-citrine-400" />
            Export Research Report Assets
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Generate normalized technical research reports for <span className="font-semibold text-foreground">{projectTitle}</span>
          </p>
        </DialogHeader>

        {isResearching && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mt-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Research is currently in progress. Final export will be updated when the research run completes.</span>
          </div>
        )}

        <div className="space-y-2.5 mt-3">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const isLoading = loadingFormat === f.format;
            const isSuccess = successFormats[f.format];
            const isDisabled = !!loadingFormat;

            return (
              <button
                key={f.format}
                onClick={() => handleExport(f.format)}
                disabled={isDisabled}
                className="w-full flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/40 disabled:opacity-60 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-muted text-citrine-400 group-hover:bg-citrine-400/10 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{f.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {f.subtitle}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isSuccess ? 'outline' : 'ghost'}
                  disabled={isDisabled}
                  className="h-8 px-3 text-xs shrink-0 ml-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Building...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1.5" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export
                    </>
                  )}
                </Button>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
