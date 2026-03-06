import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, CheckCircle, XCircle, Loader2, FileVideo, AlertTriangle } from 'lucide-react';
import { uploadManager, type QueuedFile, type FileStatus } from './uploadManager';
import { supabase } from '@/integrations/supabase/client';

interface BulkVideoUploadProps {
  moduleId: string;
  existingLessonCount: number;
  onComplete: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Subscribe to the module-level upload manager so UI stays in sync
function useUploadQueue() {
  const [queue, setQueue] = useState<QueuedFile[]>(uploadManager.getQueue());
  useEffect(() => {
    return uploadManager.subscribe(setQueue);
  }, []);
  return queue;
}

export function BulkVideoUpload({ moduleId, existingLessonCount, onComplete }: BulkVideoUploadProps) {
  const [open, setOpen] = useState(false);
  const [compressEnabled, setCompressEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queue = useUploadQueue();
  const isUploading = uploadManager.getIsUploading();

  const [duplicateFiles, setDuplicateFiles] = useState<QueuedFile[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [pendingNonDuplicates, setPendingNonDuplicates] = useState<File[]>([]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // Fetch existing lesson titles in this module
    const { data: existingLessons } = await supabase
      .from('course_lessons')
      .select('title')
      .eq('module_id', moduleId);

    const existingTitles = new Set(
      (existingLessons || []).map((l) => l.title.toLowerCase().trim())
    );

    // Also check titles already in the queue
    const queueTitles = new Set(
      queue.map((q) => q.parsedTitle.toLowerCase().trim())
    );

    const dupes: File[] = [];
    const nonDupes: File[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue;
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const match = nameWithoutExt.match(/^(\d+)\s*[-_.\s]\s*(.+)$/);
      const rawTitle = match
        ? match[2].replace(/[-_]/g, ' ').trim()
        : nameWithoutExt.replace(/[-_]/g, ' ').trim();
      const parsedTitle = rawTitle
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (existingTitles.has(parsedTitle.toLowerCase()) || queueTitles.has(parsedTitle.toLowerCase())) {
        dupes.push(file);
      } else {
        nonDupes.push(file);
      }
    }

    // Add non-duplicates immediately
    if (nonDupes.length > 0) {
      uploadManager.addFiles(nonDupes);
    }

    // If duplicates found, ask user
    if (dupes.length > 0) {
      setPendingNonDuplicates([]); // not needed but reset
      // Build temp QueuedFile objects for display
      const dupeItems: QueuedFile[] = dupes.map((f) => {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        const match = nameWithoutExt.match(/^(\d+)\s*[-_.\s]\s*(.+)$/);
        const rawTitle = match
          ? match[2].replace(/[-_]/g, ' ').trim()
          : nameWithoutExt.replace(/[-_]/g, ' ').trim();
        const parsedTitle = rawTitle
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        return {
          file: f,
          id: crypto.randomUUID(),
          parsedTitle,
          parsedOrder: 0,
          status: 'pending' as FileStatus,
          progress: 0,
          compressionProgress: 0,
          isDuplicate: true,
        };
      });
      setDuplicateFiles(dupeItems);
      setShowDuplicateAlert(true);
    }
  }, [moduleId, queue]);

  const handleConfirmDuplicates = useCallback(() => {
    // User chose to upload duplicates anyway
    const files = duplicateFiles.map((d) => d.file);
    uploadManager.addFiles(files);
    setShowDuplicateAlert(false);
    setDuplicateFiles([]);
  }, [duplicateFiles]);

  const handleSkipDuplicates = useCallback(() => {
    setShowDuplicateAlert(false);
    setDuplicateFiles([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleUploadAll = () => {
    uploadManager.startUpload(moduleId, existingLessonCount, compressEnabled, onComplete);
  };

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'compressing':
        return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileVideo className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Allow closing even during upload — uploads continue in background
        setOpen(v);
        if (!v && !isUploading) uploadManager.resetQueue();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Upload className="h-3 w-3" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Video Upload</DialogTitle>
        </DialogHeader>

        {/* Upload in progress banner */}
        {isUploading && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploads continue even if you close this dialog or navigate away.
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop video files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepts video files up to 5GB each · Resumable uploads
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Compression toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="compress-toggle"
            checked={compressEnabled}
            onCheckedChange={setCompressEnabled}
            disabled={isUploading}
          />
          <Label htmlFor="compress-toggle" className="text-sm text-muted-foreground cursor-pointer">
            Compress videos before upload <span className="text-xs">(slower processing, smaller files)</span>
          </Label>
        </div>

        {/* File queue table */}
        {queue.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead className="w-20">Size</TableHead>
                  <TableHead className="w-32">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{statusIcon(item.status)}</TableCell>
                    <TableCell>
                      {item.status === 'pending' ? (
                        <Input
                          value={item.parsedTitle}
                          onChange={(e) => uploadManager.updateFile(item.id, { parsedTitle: e.target.value })}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{item.parsedTitle}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.parsedOrder || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.compressedSize
                        ? `${formatSize(item.compressedSize)} (${Math.round((1 - item.compressedSize / item.file.size) * 100)}% saved)`
                        : formatSize(item.file.size)}
                    </TableCell>
                    <TableCell>
                      {item.status === 'compressing' ? (
                        <div>
                          <Progress value={item.compressionProgress} className="h-2" />
                          <span className="text-xs text-muted-foreground">Compressing…</span>
                        </div>
                      ) : item.status === 'uploading' ? (
                        <div>
                          <Progress value={item.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground">Uploading…</span>
                        </div>
                      ) : item.status === 'error' ? (
                        <span className="text-xs text-destructive truncate block max-w-[120px]" title={item.error}>
                          {item.error}
                        </span>
                      ) : item.status === 'done' ? (
                        <span className="text-xs text-green-500">Done</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); uploadManager.removeFile(item.id); }}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Action */}
        {queue.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || queue.every((f) => f.status === 'done')}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload & Create Lessons
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
