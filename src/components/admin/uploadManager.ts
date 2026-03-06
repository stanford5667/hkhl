/**
 * Module-level upload manager that persists across React component mounts/unmounts.
 * Uploads continue even when the user navigates away from the admin page.
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as tus from 'tus-js-client';
import { compressVideo } from './videoCompression';

export type FileStatus = 'pending' | 'compressing' | 'uploading' | 'done' | 'error';

export interface QueuedFile {
  file: File;
  id: string;
  parsedTitle: string;
  parsedOrder: number;
  status: FileStatus;
  progress: number;
  compressionProgress: number;
  compressedSize?: number;
  error?: string;
}

type Listener = (queue: QueuedFile[]) => void;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;
const STANDARD_UPLOAD_LIMIT = 200 * 1024 * 1024;
const CONCURRENCY = 3;

// ── Singleton state ──────────────────────────────────────────────
let queue: QueuedFile[] = [];
let isUploading = false;
let listeners: Listener[] = [];

function notify() {
  // Snapshot so React sees a new array ref
  const snapshot = [...queue];
  listeners.forEach((l) => l(snapshot));
}

function updateItem(id: string, updates: Partial<QueuedFile>) {
  queue = queue.map((f) => (f.id === id ? { ...f, ...updates } : f));
  notify();
}

// ── Public API ───────────────────────────────────────────────────
export const uploadManager = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    // Immediately send current state
    listener([...queue]);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getQueue(): QueuedFile[] {
    return [...queue];
  },

  getIsUploading(): boolean {
    return isUploading;
  },

  addFiles(files: FileList | File[]) {
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
        compressionProgress: 0,
      });
    }
    queue = [...queue, ...newFiles];
    notify();
  },

  updateFile(id: string, updates: Partial<QueuedFile>) {
    updateItem(id, updates);
  },

  removeFile(id: string) {
    queue = queue.filter((f) => f.id !== id);
    notify();
  },

  clearDone() {
    queue = queue.filter((f) => f.status !== 'done');
    notify();
  },

  resetQueue() {
    if (!isUploading) {
      queue = [];
      notify();
    }
  },

  async startUpload(
    moduleId: string,
    existingLessonCount: number,
    compressEnabled: boolean,
    onAllComplete: () => void,
  ) {
    if (isUploading) return;
    isUploading = true;
    notify();

    // Show a persistent toast
    const toastId = toast.loading('Uploading videos… You can navigate away safely.');

    const pending = queue.filter((f) => f.status !== 'done');
    const alreadyDone = queue.length - pending.length;
    let successCount = alreadyDone;
    let errorCount = 0;

    let index = 0;
    const worker = async () => {
      while (index < pending.length) {
        const current = pending[index++];
        const ok = await uploadSingleFile(current, moduleId, existingLessonCount, compressEnabled);
        if (ok) successCount++;
        else errorCount++;
        // Update the persistent toast
        toast.loading(
          `Uploading videos… ${successCount}/${successCount + errorCount + (pending.length - index)} complete`,
          { id: toastId },
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()),
    );

    isUploading = false;
    notify();

    toast.success(`${successCount} of ${successCount + errorCount} videos uploaded`, { id: toastId });

    if (errorCount === 0) {
      onAllComplete();
      queue = [];
      notify();
    } else {
      onAllComplete();
    }
  },
};

// ── Upload helpers (unchanged logic, just module-scoped) ─────────

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

function standardUpload(
  file: File,
  filePath: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/course-videos/${filePath}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Cache-Control', '3600');
      xhr.setRequestHeader('x-upsert', 'false');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage.from('course-videos').getPublicUrl(filePath);
          resolve(data.publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
}

function tusUpload(
  file: File,
  filePath: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;
    const chunkSize = Math.min(file.size, 150 * 1024 * 1024);

    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'course-videos',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => onProgress((bytesUploaded / bytesTotal) * 100),
      onSuccess: () => {
        const { data } = supabase.storage.from('course-videos').getPublicUrl(filePath);
        resolve(data.publicUrl);
      },
    });

    const previousUploads = await upload.findPreviousUploads();
    if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
    upload.start();
  });
}

function doUploadFile(file: File, filePath: string, onProgress: (pct: number) => void): Promise<string> {
  if (file.size <= STANDARD_UPLOAD_LIMIT) return standardUpload(file, filePath, onProgress);
  return tusUpload(file, filePath, onProgress);
}

async function uploadSingleFile(
  item: QueuedFile,
  moduleId: string,
  existingLessonCount: number,
  compressEnabled: boolean,
): Promise<boolean> {
  try {
    let fileToUpload = item.file;
    let ext = '';

    if (compressEnabled) {
      try {
        updateItem(item.id, { status: 'compressing', compressionProgress: 0 });
        const { compressedFile, compressedSize } = await compressVideo(
          item.file,
          (pct) => updateItem(item.id, { compressionProgress: pct }),
        );
        updateItem(item.id, { compressedSize });
        fileToUpload = compressedFile;
        ext = '.mp4';
      } catch (compressErr) {
        console.warn('Compression failed, uploading original file:', compressErr);
        fileToUpload = item.file;
        ext = '';
      }
    }

    updateItem(item.id, { status: 'uploading', progress: 0 });
    const timestamp = Date.now();
    const sanitizedName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_') + (ext ? ext.replace(/\.[^/.]+$/, '') : '');
    const filePath = `lessons/${timestamp}-${sanitizedName}`;

    const publicUrl = await doUploadFile(
      fileToUpload,
      filePath,
      (pct) => updateItem(item.id, { progress: pct }),
    );

    const currentQueue = queue;
    const orderIndex = item.parsedOrder > 0
      ? existingLessonCount + item.parsedOrder
      : existingLessonCount + currentQueue.indexOf(item) + 1;

    // Refresh the session before DB insert — uploads can take long enough
    // for the JWT to expire, causing RLS violations with the anon key.
    await supabase.auth.refreshSession();

    const { error: insertError } = await supabase
      .from('course_lessons')
      .insert({
        module_id: moduleId,
        title: item.parsedTitle,
        video_url: publicUrl,
        video_provider: 'custom',
        order_index: orderIndex,
      });

    if (insertError) {
      updateItem(item.id, { status: 'error', progress: 0, error: insertError.message });
      return false;
    }

    updateItem(item.id, { status: 'done', progress: 100 });
    return true;
  } catch (err: any) {
    updateItem(item.id, { status: 'error', progress: 0, error: err.message });
    return false;
  }
}
