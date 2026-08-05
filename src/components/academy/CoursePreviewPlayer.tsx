import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPreviewLimitSeconds, getPreviewLabel } from '@/lib/coursePreview';
import { getTopicThumbnail } from '@/lib/lessonThumbnails';

interface CoursePreviewPlayerProps {
  lessonTitle?: string | null;
  lessonNumberLabel?: string | null;
  videoUrl?: string | null;
  videoProvider?: string | null;
  videoDuration?: number | null;
  /** Members watch the full lesson; non-members get the capped window. */
  hasAccess?: boolean;
  onOpenLesson?: () => void;
  onUpgrade?: () => void;
}

const isDirectVideo = (url: string) => {
  const clean = url.split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => clean.endsWith(ext));
};

function buildEmbedUrl(url: string, provider: string, muted: boolean, limitSeconds?: number) {
  if (provider === 'vimeo') {
    const id = url.split('/').pop();
    return `https://player.vimeo.com/video/${id}?autoplay=1&muted=${muted ? 1 : 0}`;
  }
  const videoId = url.includes('v=')
    ? url.split('v=')[1]?.split('&')[0]
    : url.split('/').pop()?.split('?')[0];
  const end = limitSeconds ? `&start=0&end=${limitSeconds}` : '';
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&autoplay=1&mute=${
    muted ? 1 : 0
  }&playsinline=1&modestbranding=1&controls=1${end}`;
}

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function CoursePreviewPlayer({
  lessonTitle,
  lessonNumberLabel,
  videoUrl,
  videoProvider,
  videoDuration,
  hasAccess,
  onOpenLesson,
  onUpgrade,
}: CoursePreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const effectiveDuration = videoDuration || duration;
  const previewLimit = getPreviewLimitSeconds(effectiveDuration);
  const previewLabel = getPreviewLabel(effectiveDuration);
  const provider = videoProvider || 'youtube';
  const direct = !!videoUrl && isDirectVideo(videoUrl);

  const embedUrl = useMemo(() => {
    if (!videoUrl || direct) return null;
    return buildEmbedUrl(videoUrl, provider, muted, hasAccess ? undefined : previewLimit);
  }, [videoUrl, direct, provider, muted, hasAccess, previewLimit]);

  const sendCommand = useCallback((command: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (provider === 'vimeo') {
      iframe.contentWindow.postMessage(JSON.stringify({ method: command }), '*');
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: '' }),
        '*'
      );
    }
  }, [provider]);

  const togglePlay = useCallback(() => {
    if (direct) {
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) {
        el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
      return;
    }
    if (playing) {
      sendCommand(provider === 'vimeo' ? 'pause' : 'pauseVideo');
      setPlaying(false);
    } else {
      sendCommand(provider === 'vimeo' ? 'play' : 'playVideo');
      setPlaying(true);
    }
  }, [direct, playing, provider, sendCommand]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (direct && videoRef.current) {
      videoRef.current.muted = next;
    } else if (!direct) {
      sendCommand(provider === 'vimeo' ? 'setVolume' : next ? 'mute' : 'unMute');
    }
  }, [direct, muted, provider, sendCommand]);

  // Try to start with sound. If the browser blocks unmuted autoplay,
  // fall back to muted playback and unmute on the first user gesture.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;

    const unmuteOnGesture = () => {
      const v = videoRef.current;
      if (v) {
        v.muted = false;
        setMuted(false);
        v.play().catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener('pointerdown', unmuteOnGesture);
      document.removeEventListener('keydown', unmuteOnGesture);
    };

    el.muted = false;
    el.play().catch(() => {
      if (cancelled) return;
      el.muted = true;
      setMuted(true);
      el.play().catch(() => {});
      document.addEventListener('pointerdown', unmuteOnGesture, { once: true });
      document.addEventListener('keydown', unmuteOnGesture, { once: true });
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [videoUrl]);

  // Keep the big overlay button visible briefly after a pause.
  useEffect(() => {
    if (!playing) {
      setShowOverlay(true);
      return;
    }
    const timer = setTimeout(() => setShowOverlay(false), 1500);
    return () => clearTimeout(timer);
  }, [playing]);

  if (!videoUrl) return null;

  const remaining = Math.max(0, previewLimit - current);
  const total = effectiveDuration || previewLimit;
  const playedPct = Math.min(100, (current / total) * 100);
  const limitPct = Math.min(100, (previewLimit / total) * 100);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_20px_50px_-20px_hsl(var(--background))]">
      {/* Video */}
      <div className="group relative aspect-video overflow-hidden bg-black">
        {embedUrl ? (
          <iframe
            ref={iframeRef}
            key={embedUrl}
            src={embedUrl}
            title={lessonTitle || 'Course preview'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={videoUrl}
            poster={getTopicThumbnail(lessonTitle)}
            autoPlay
            muted={muted}
            playsInline
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(Math.floor(d));
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onClick={togglePlay}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setCurrent(el.currentTime);
              if (!hasAccess && el.currentTime >= previewLimit) {
                el.pause();
                el.currentTime = previewLimit;
              }
            }}
          />
        )}

        {/* Top overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 sm:p-5">
          <div className="flex flex-col items-start gap-2">
            {!hasAccess && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary-foreground backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                Free preview
              </span>
            )}
            {!hasAccess && (
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                <span className="text-xs font-medium text-foreground">
                  {direct
                    ? `${fmt(remaining)} remaining`
                    : previewLabel
                      ? `${previewLabel} preview`
                      : 'Short preview'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Centered prominent play/pause overlay */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause preview' : 'Play preview'}
          className={`absolute inset-0 z-20 flex items-center justify-center bg-black/20 transition-opacity duration-200 focus:outline-none ${
            showOverlay || !playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-background/80 text-foreground shadow-xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 sm:h-20 sm:w-20">
            {playing ? (
              <Pause className="h-5 w-5 fill-current sm:h-8 sm:w-8" />
            ) : (
              <Play className="h-5 w-5 fill-current pl-0.5 sm:h-8 sm:w-8" />
            )}
          </span>
        </button>

        {/* Persistent bottom control bar */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2.5 pt-8 sm:p-5 sm:pt-12">
          <div className="flex items-center gap-2 text-foreground/90 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause preview' : 'Play preview'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-accent hover:text-accent-foreground sm:h-11 sm:w-11"
            >
              {playing ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current pl-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute preview' : 'Mute preview'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-accent hover:text-accent-foreground sm:h-11 sm:w-11"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.5)]"
                style={{ width: `${playedPct}%` }}
              />
              {!hasAccess && limitPct < 100 && (
                <div
                  className="absolute top-0 z-10 h-full w-0.5 bg-primary"
                  style={{ left: `${limitPct}%` }}
                />
              )}
            </div>

            <span className="hidden font-mono text-[11px] tabular-nums tracking-tight text-foreground/90 sm:inline-block">
              {fmt(current)} / {fmt(total)}
            </span>

            <button
              type="button"
              onClick={() => {
                if (direct) {
                  videoRef.current?.requestFullscreen?.();
                } else {
                  iframeRef.current?.requestFullscreen?.();
                }
              }}
              aria-label="Fullscreen"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-4 border-t border-border/60 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {lessonNumberLabel || 'Lesson 1'}
            </p>
            <h3 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
              {lessonTitle || 'Start here'}
            </h3>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          {onOpenLesson && (
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={onOpenLesson}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {hasAccess ? 'Open lesson' : 'Watch in player'}
            </Button>
          )}
          {!hasAccess && onUpgrade && (
            <Button className="flex-1 sm:flex-none" onClick={onUpgrade}>
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoursePreviewPlayer;
