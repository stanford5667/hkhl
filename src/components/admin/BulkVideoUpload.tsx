import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, CheckCircle, XCircle, Loader2, FileVideo } from 'lucide-react';
import * as tus from 'tus-js-client';

interface BulkVideoUploadProps {
  moduleId: string;
  existingLessonCount: number;
  onComplete: () => void;
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueuedFile {
  file: File;
  id: string;
  parsedTitle: string;
  parsedOrder: number;
  status: FileStatus;
  progress: number;
  error?: string;
}

function parseFilename(filename: string): { title: string; order: number } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const match = nameWithoutExt.match(/^(\d+)\s*[-_.\s]\s*(.+)$/);

  if (match) {
    const order = parseInt(match[1], 10);
    const rawTitle = match[2].replace(/[-_]/g, ' ').trim();
    const title = rawTitle
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return { title, order };
  }

  const rawTitle = nameWithoutExt.replace(/[-_]/g, ' ').trim();
  const title = rawTitle
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return { title, order: 0 };
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function tusUpload(
  file: File,
  filePath: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'course-videos',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress((bytesUploaded / bytesTotal) * 100);
      },
      onSuccess: () => {
        const { data } = supabase.storage
          .from('course-videos')
          .getPublicUrl(filePath);
        resolve(data.publicUrl);
      },
    });

    // Check for previous uploads to resume
    const previousUploads = await upload.findPreviousUploads();
    if (previousUploads.length > 0) {
      upload.resumeFromPreviousUpload(previousUploads[0]);
    }

    upload.start();
  });
}

export function BulkVideoUpload({ moduleId, existingLessonCount, onComplete }: BulkVideoUploadProps) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: QueuedFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a video file`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5GB limit`);
        continue;
      }
      const { title, order } = parseFilename(file.name);
      newFiles.push({
        file,
        id: crypto.randomUUID(),
        parsedTitle: title,
        parsedOrder: order,
        status: 'pending',
        progress: 0,
      });
    }
    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateFile = (id: string, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (item: QueuedFile): Promise<boolean> => {
    updateFile(item.id, { status: 'uploading', progress: 0 });

    try {
      const timestamp = Date.now();
      const sanitizedName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `lessons/${timestamp}-${sanitizedName}`;

      const publicUrl = await tusUpload(
        item.file,
        filePath,
        (pct) => updateFile(item.id, { progress: pct }),
      );

      const orderIndex = item.parsedOrder > 0
        ? existingLessonCount + item.parsedOrder
        : existingLessonCount + queue.indexOf(item) + 1;

      const { error: insertError } = await supabase
        .from('course_lessons')
        .insert({
          module_id: moduleId,
          title: item.parsedTitle,
          video_url: publicUrl,
          video_provider: 'custom',
          order_index: orderIndex,
        });

      if (insertError) throw insertError;

      updateFile(item.id, { status: 'done', progress: 100 });
      return true;
    } catch (err: any) {
      updateFile(item.id, { status: 'error', progress: 0, error: err.message });
      return false;
    }
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    const pending = queue.filter((f) => f.status !== 'done');
    const alreadyDone = queue.length - pending.length;
    let successCount = alreadyDone;
    let errorCount = 0;

    const CONCURRENCY = 3;
    let index = 0;

    const worker = async () => {
      while (index < pending.length) {
        const current = pending[index++];
        const ok = await uploadSingleFile(current);
        if (ok) successCount++;
        else errorCount++;
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()));

    setIsUploading(false);
    toast.success(`${successCount} of ${successCount + errorCount} videos uploaded successfully`);

    if (errorCount === 0) {
      onComplete();
      setQueue([]);
      setOpen(false);
    } else {
      onComplete();
    }
  };

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileVideo className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isUploading) { setOpen(v); if (!v) setQueue([]); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Upload className="h-3 w-3" /> Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Video Upload</DialogTitle>
        </DialogHeader>

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
                          onChange={(e) => updateFile(item.id, { parsedTitle: e.target.value })}
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
                      {formatSize(item.file.size)}
                    </TableCell>
                    <TableCell>
                      {item.status === 'uploading' ? (
                        <Progress value={item.progress} className="h-2" />
                      ) : item.status === 'error' ? (
                        <span className="text-xs text-destructive truncate block max-w-[120px]" title={item.error}>
                          {item.error}
                        </span>
                      ) : item.status === 'done' ? (
                        <span className="text-xs text-green-500">Done</span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
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
