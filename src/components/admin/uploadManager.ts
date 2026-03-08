/**
 * Module-level upload manager that persists across React component mounts/unmounts.
 * Uploads continue even when the user navigates away from the admin page.
 * Supports pause, resume, and stop (cancel) operations.
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as tus from 'tus-js-client';
import { compressVideo } from './videoCompression';

export type FileStatus = 'pending' | 'compressing' | 'uploading' | 'done' | 'error' | 'cancelled' | 'paused';

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
  isDuplicate?: boolean;
  duplicateConfirmed?: boolean;
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
let isPaused = false;
let isStopped = false;
let listeners: Listener[] = [];
let activeWorkerCount = 0;
let successCount = 0;
let errorCount = 0;
let currentToastId: string | number | undefined;
let currentOnAllComplete: (() => void) | null = null;
let currentModuleId = '';
let currentExistingLessonCount = 0;
let currentCompressEnabled = false;

// Track active upload handles so we can abort them
let activeXHRs: Map<string, XMLHttpRequest> = new Map();
let activeTusUploads: Map<string, tus.Upload> = new Map();

function notify() {
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

  getIsPaused(): boolean {
    return isPaused;
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

    if (isUploading && !isPaused && newFiles.length > 0) {
      ensureWorkers();
      toast.info(`${newFiles.length} new video(s) queued — uploading now.`);
    }
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
      activeXHRs.clear();
      activeTusUploads.clear();
      notify();
    }
  },

  /** Pause all uploads. Active uploads are aborted and reset to pending so they can be resumed. */
  pause() {
    if (!isUploading || isPaused) return;
    isPaused = true;
    console.log('[UploadManager] Pausing uploads...');

    // Abort all active XHRs
    for (const [id, xhr] of activeXHRs) {
      xhr.abort();
      updateItem(id, { status: 'paused', progress: 0 });
    }
    activeXHRs.clear();

    // Abort all active TUS uploads
    for (const [id, upload] of activeTusUploads) {
      upload.abort();
      // TUS uploads can resume, so keep their progress
      const item = queue.find((f) => f.id === id);
      updateItem(id, { status: 'paused' });
    }
    activeTusUploads.clear();

    // Mark any compressing files as paused too
    queue.forEach((f) => {
      if (f.status === 'compressing') {
        updateItem(f.id, { status: 'paused', compressionProgress: 0 });
      }
    });

    activeWorkerCount = 0;
    toast.info('Uploads paused', { id: currentToastId });
    notify();
  },

  /** Resume paused uploads */
  resume() {
    if (!isUploading || !isPaused) return;
    isPaused = false;
    isStopped = false;
    console.log('[UploadManager] Resuming uploads...');

    // Move paused items back to pending
    queue = queue.map((f) =>
      f.status === 'paused' ? { ...f, status: 'pending' as FileStatus, progress: 0, compressionProgress: 0 } : f,
    );
    notify();

    toast.loading('Resuming uploads…', { id: currentToastId });
    ensureWorkers();
  },

  /** Stop all uploads. Cancels everything and resets the queue. */
  stop() {
    console.log('[UploadManager] Stopping all uploads...');
    isStopped = true;
    isPaused = false;

    // Abort all active XHRs
    for (const [id, xhr] of activeXHRs) {
      xhr.abort();
    }
    activeXHRs.clear();

    // Abort all active TUS uploads
    for (const [id, upload] of activeTusUploads) {
      upload.abort();
    }
    activeTusUploads.clear();

    // Mark non-done items as cancelled
    queue = queue.map((f) =>
      f.status !== 'done' && f.status !== 'error'
        ? { ...f, status: 'cancelled' as FileStatus, progress: 0, compressionProgress: 0 }
        : f,
    );

    activeWorkerCount = 0;
    isUploading = false;
    notify();

    const msg = successCount > 0
      ? `Upload stopped. ${successCount} video(s) completed before cancellation.`
      : 'Upload cancelled.';
    toast.info(msg, { id: currentToastId });

    if (currentOnAllComplete) currentOnAllComplete();
  },

  async startUpload(
    moduleId: string,
    existingLessonCount: number,
    compressEnabled: boolean,
    onAllComplete: () => void,
  ) {
    if (isUploading) {
      if (isPaused) {
        this.resume();
      } else {
        ensureWorkers();
      }
      return;
    }
    isUploading = true;
    isPaused = false;
    isStopped = false;
    activeWorkerCount = 0;
    successCount = 0;
    errorCount = 0;
    currentModuleId = moduleId;
    currentExistingLessonCount = existingLessonCount;
    currentCompressEnabled = compressEnabled;
    notify();

    currentToastId = toast.loading('Uploading videos… You can navigate away safely.');
    currentOnAllComplete = onAllComplete;

    ensureWorkers();
  },
};

// ── Ensure enough workers are running ────────────────────────────
function ensureWorkers() {
  if (isPaused || isStopped) return;
  const pendingCount = queue.filter((f) => f.status === 'pending').length;
  const neededWorkers = Math.min(pendingCount, CONCURRENCY) - activeWorkerCount;
  for (let i = 0; i < neededWorkers; i++) {
    spawnWorker();
  }
}

// ── Worker spawner ───────────────────────────────────────────────
function spawnWorker() {
  activeWorkerCount++;
  const run = async () => {
    while (true) {
      if (isPaused || isStopped) break;
      const next = queue.find((f) => f.status === 'pending');
      if (!next) break;
      updateItem(next.id, { status: 'compressing' });
      const ok = await uploadSingleFile(next, currentModuleId, currentExistingLessonCount, currentCompressEnabled);
      if (isPaused || isStopped) break;
      if (ok) successCount++;
      else errorCount++;
      const remaining = queue.filter((f) => f.status === 'pending').length;
      if (!isPaused && !isStopped) {
        toast.loading(
          `Uploading videos… ${successCount} done, ${remaining} remaining`,
          { id: currentToastId },
        );
      }
    }
    activeWorkerCount--;
    if (activeWorkerCount <= 0 && !isPaused && !isStopped) {
      const stragglers = queue.filter((f) => f.status === 'pending').length;
      if (stragglers > 0) {
        ensureWorkers();
        return;
      }
      isUploading = false;
      notify();
      toast.success(`${successCount} of ${successCount + errorCount} videos uploaded`, { id: currentToastId });
      if (currentOnAllComplete) currentOnAllComplete();
      if (errorCount === 0) {
        queue = [];
        notify();
      }
    }
  };
  run();
}

// ── Upload helpers ───────────────────────────────────────────────

function parseFilename(filename: string): { title: string; order: number } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const match = nameWithoutExt.match(/^(\d+)\s*[-_.\s]\s*(.+)$/);
  if (match) {
    const order = parseInt(match[1], 10);
    const rawTitle = match[2].replace(/[-_]/g, ' ').trim();
    const title = rawTitle.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return { title, order };
  }
  const rawTitle = nameWithoutExt.replace(/[-_]/g, ' ').trim();
  const title = rawTitle.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return { title, order: 0 };
}

async function getAuthToken(): Promise<string> {
  try {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) return refreshData.session.access_token;
    if (refreshError) console.warn('[UploadManager] refreshSession failed:', refreshError.message);
  } catch (e) {
    console.warn('[UploadManager] refreshSession threw:', e);
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (e) {
    console.warn('[UploadManager] getSession threw:', e);
  }
  throw new Error('Your session has expired. Please log in again and retry the upload.');
}

function standardUpload(
  file: File,
  filePath: string,
  itemId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAuthToken();
      const xhr = new XMLHttpRequest();
      activeXHRs.set(itemId, xhr);

      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/course-videos/${filePath}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Cache-Control', '3600');
      xhr.setRequestHeader('x-upsert', 'true');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
      });
      xhr.addEventListener('load', () => {
        activeXHRs.delete(itemId);
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage.from('course-videos').getPublicUrl(filePath);
          resolve(data.publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
        }
      });
      xhr.addEventListener('error', () => { activeXHRs.delete(itemId); reject(new Error('Network error during upload')); });
      xhr.addEventListener('abort', () => { activeXHRs.delete(itemId); reject(new Error('Upload paused or cancelled')); });
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
}

function tusUpload(
  file: File,
  filePath: string,
  itemId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const token = await getAuthToken();
    const chunkSize = Math.min(file.size, 150 * 1024 * 1024);

    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'course-videos',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize,
      onShouldRetry: (err, retryAttempt, options) => {
        console.warn(`[UploadManager] TUS retry #${retryAttempt}`, err);
        // Don't retry on 413 (file too large for storage)
        const errMsg = err?.originalResponse?._xhr?.responseText || err?.message || '';
        if (errMsg.includes('Maximum size exceeded') || errMsg.includes('413')) {
          return false;
        }
        getAuthToken().then((newToken) => {
          if (options.headers) options.headers.authorization = `Bearer ${newToken}`;
        });
        return retryAttempt < 5;
      },
      onError: (error) => { activeTusUploads.delete(itemId); reject(error); },
      onProgress: (bytesUploaded, bytesTotal) => onProgress((bytesUploaded / bytesTotal) * 100),
      onSuccess: () => {
        activeTusUploads.delete(itemId);
        const { data } = supabase.storage.from('course-videos').getPublicUrl(filePath);
        resolve(data.publicUrl);
      },
    });

    activeTusUploads.set(itemId, upload);
    const previousUploads = await upload.findPreviousUploads();
    if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
    upload.start();
  });
}

function doUploadFile(file: File, filePath: string, itemId: string, onProgress: (pct: number) => void): Promise<string> {
  if (file.size <= STANDARD_UPLOAD_LIMIT) return standardUpload(file, filePath, itemId, onProgress);
  return tusUpload(file, filePath, itemId, onProgress);
}

async function uploadSingleFile(
  item: QueuedFile,
  moduleId: string,
  existingLessonCount: number,
  compressEnabled: boolean,
): Promise<boolean> {
  try {
    if (isPaused || isStopped) return false;

    let fileToUpload = item.file;
    let ext = '';

    if (compressEnabled) {
      try {
        updateItem(item.id, { status: 'compressing', compressionProgress: 0 });
        const { compressedFile, compressedSize } = await compressVideo(
          item.file,
          (pct) => updateItem(item.id, { compressionProgress: pct }),
        );
        if (isPaused || isStopped) return false;
        updateItem(item.id, { compressedSize });
        fileToUpload = compressedFile;
        ext = '.mp4';
      } catch (compressErr) {
        if (isPaused || isStopped) return false;
        console.warn('[UploadManager] Compression failed, uploading original:', compressErr);
        fileToUpload = item.file;
        ext = '';
      }
    }

    if (isPaused || isStopped) return false;

    updateItem(item.id, { status: 'uploading', progress: 0 });
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalExt = ext || '';
    const filePath = `lessons/${timestamp}-${randomSuffix}-${sanitizedName}${finalExt}`;

    const publicUrl = await doUploadFile(
      fileToUpload,
      filePath,
      item.id,
      (pct) => updateItem(item.id, { progress: pct }),
    );

    if (isPaused || isStopped) return false;

    const currentQueue = queue;
    const queueIndex = currentQueue.findIndex((f) => f.id === item.id);
    const orderIndex = item.parsedOrder > 0
      ? existingLessonCount + item.parsedOrder
      : existingLessonCount + (queueIndex >= 0 ? queueIndex : 0) + 1;

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
    // Don't mark as error if we paused/stopped — it was intentional
    if (isPaused || isStopped) return false;
    console.error(`[UploadManager] ❌ FAILED "${item.parsedTitle}":`, err);
    updateItem(item.id, { status: 'error', progress: 0, error: err.message });
    return false;
  }
}
