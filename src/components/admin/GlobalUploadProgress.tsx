import { useEffect, useState } from 'react';
import { uploadManager, QueuedFile } from './uploadManager';
import { Progress } from '@/components/ui/progress';
import { Upload, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalUploadProgress() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return uploadManager.subscribe(setQueue);
  }, []);

  const activeFiles = queue.filter((f) => f.status !== 'done' || !dismissed);
  const uploading = queue.filter((f) => f.status === 'uploading' || f.status === 'compressing');
  const done = queue.filter((f) => f.status === 'done');
  const errors = queue.filter((f) => f.status === 'error');
  const isActive = uploadManager.getIsUploading();

  // Don't render if nothing in queue
  if (queue.length === 0) return null;
  // Don't render if all done and dismissed
  if (done.length === queue.length && dismissed) return null;

  const overallProgress = queue.length > 0
    ? queue.reduce((sum, f) => sum + (f.status === 'done' ? 100 : f.progress), 0) / queue.length
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background shadow-xl">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : errors.length > 0 ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span>
            {isActive
              ? `Uploading ${uploading.length} of ${queue.length} videos`
              : `${done.length}/${queue.length} uploaded`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
          {!isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
                uploadManager.clearDone();
                uploadManager.resetQueue();
              }}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      {isActive && (
        <div className="px-3 pb-2">
          <Progress value={overallProgress} className="h-1.5" />
        </div>
      )}

      {/* Expanded file list */}
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-border">
          {queue.map((file) => (
            <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              {file.status === 'done' ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
              ) : file.status === 'error' ? (
                <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
              ) : file.status === 'uploading' || file.status === 'compressing' ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
              ) : (
                <Upload className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate flex-1 text-foreground">{file.parsedTitle}</span>
              <span className="shrink-0 text-muted-foreground">
                {file.status === 'compressing'
                  ? `${Math.round(file.compressionProgress)}%`
                  : file.status === 'uploading'
                    ? `${Math.round(file.progress)}%`
                    : file.status === 'done'
                      ? '✓'
                      : file.status === 'error'
                        ? '✗'
                        : 'queued'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
