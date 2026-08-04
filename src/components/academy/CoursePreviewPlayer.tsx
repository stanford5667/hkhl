import { useMemo, useState } from 'react';
import { Play, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPreviewLimitSeconds, getPreviewLabel } from '@/lib/coursePreview';

interface CoursePreviewPlayerProps {
  lessonTitle?: string | null;
  videoUrl?: string | null;
  videoProvider?: string | null;
  videoDuration?: number | null;
  /** Members watch the full lesson; non-members get the capped window. */
  hasAccess?: boolean;
  onOpenLesson?: () => void;
}

function buildEmbedUrl(
  url: string,
  provider: string,
  muted: boolean,
  limitSeconds?: number
) {
  if (provider === 'vimeo') {
    const id = url.split('/').pop();
    return `https://player.vimeo.com/video/${id}?autoplay=1&muted=${muted ? 1 : 0}&loop=0`;
  }
  const videoId = url.includes('v=')
    ? url.split('v=')[1]?.split('&')[0]
    : url.split('/').pop()?.split('?')[0];
  const end = limitSeconds ? `&start=0&end=${limitSeconds}` : '';
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&autoplay=1&mute=${
    muted ? 1 : 0
  }&playsinline=1&modestbranding=1${end}`;
}

const isDirectVideo = (url: string) => {
  const clean = url.split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => clean.endsWith(ext));
};

export function CoursePreviewPlayer({
  lessonTitle,
  videoUrl,
  videoProvider,
  videoDuration,
  hasAccess,
  onOpenLesson,
}: CoursePreviewPlayerProps) {
  const [muted, setMuted] = useState(true);

  const previewLimit = getPreviewLimitSeconds(videoDuration);
  const previewLabel = getPreviewLabel(videoDuration);
  const provider = videoProvider || 'youtube';

  const embedUrl = useMemo(() => {
    if (!videoUrl || isDirectVideo(videoUrl)) return null;
    return buildEmbedUrl(videoUrl, provider, muted, hasAccess ? undefined : previewLimit);
  }, [videoUrl, provider, muted, hasAccess, previewLimit]);

  if (!videoUrl) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60">
      <div className="relative aspect-video bg-black">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={lessonTitle || 'Course preview'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            className="h-full w-full object-cover"
            src={videoUrl}
            autoPlay
            muted={muted}
            playsInline
            controls
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (!hasAccess && el.currentTime >= previewLimit) {
                el.pause();
                el.currentTime = previewLimit;
              }
            }}
          />
        )}

        {!hasAccess && (
          <div className="pointer-events-none absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              {previewLabel ? `${previewLabel} preview` : 'Free preview'}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute preview' : 'Mute preview'}
          className="absolute bottom-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/60 text-white/80 backdrop-blur-md transition-colors hover:text-white"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {hasAccess ? 'Start here' : 'Now previewing'}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {lessonTitle || 'Lesson 1'}
          </p>
        </div>
        {onOpenLesson && (
          <Button size="sm" variant="secondary" onClick={onOpenLesson} className="flex-shrink-0">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {hasAccess ? 'Open lesson' : 'Watch in player'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CoursePreviewPlayer;
