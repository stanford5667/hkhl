import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;

  const ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

/**
 * Compress a video file using FFmpeg WASM.
 * Uses H.264 with CRF 28 and fast preset for a good balance of quality/size/speed.
 */
export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void,
): Promise<CompressionResult> {
  const ffmpeg = await getFFmpeg();

  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.mp4';

  // Write input file
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Track progress
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(Math.round(progress * 100), 99));
  });

  // Compress: CRF 28, ultrafast preset, scale down if > 1080p
  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-vf', 'scale=min(iw\\,1920):min(ih\\,1080):force_original_aspect_ratio=decrease',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName) as Uint8Array;

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const compressedBlob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
  const compressedFile = new File(
    [compressedBlob],
    file.name.replace(/\.[^/.]+$/, '.mp4'),
    { type: 'video/mp4' },
  );

  onProgress(100);

  return {
    compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    ratio: compressedFile.size / file.size,
  };
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^/.]+$/);
  return match ? match[0] : '.mp4';
}
