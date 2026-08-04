/**
 * FeatureVideoPreview
 * Short (13s) auto-playing, muted, looping product preview clips for the top
 * featured modules. Performance-minded:
 *  - Poster JPEG renders immediately and is the permanent fallback.
 *  - The <video> only mounts (and only loads bytes) once the card scrolls into
 *    view, and playback pauses whenever it leaves the viewport.
 *  - Respects `prefers-reduced-motion` and data-saver / slow connections by
 *    staying on the static image.
 */

import { useEffect, useRef, useState } from "react";
import { Play, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureVideo {
  src: string;
  poster: string;
  label: string;
}

/** Clips live in /public/previews (rendered product motion, no audio). */
export const FEATURE_VIDEOS = {
  ai: {
    src: "/previews/ai.mp4",
    poster: "/previews/ai.jpg",
    label: "AI research memo being generated",
  },
  backtest: {
    src: "/previews/backtest.mp4",
    poster: "/previews/backtest.jpg",
    label: "A strategy backtest running against a benchmark",
  },
  screener: {
    src: "/previews/screener.mp4",
    poster: "/previews/screener.jpg",
    label: "Screener filters narrowing the full market",
  },
} satisfies Record<string, FeatureVideo>;

export type FeatureVideoKey = keyof typeof FEATURE_VIDEOS;

function prefersLightweight() {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  const conn = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && /(^|-)(2g|slow-2g)$/.test(conn.effectiveType)) return true;
  return false;
}

export function FeatureVideoPreview({
  video,
  accent,
  className,
}: {
  video: FeatureVideo;
  accent?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [staticOnly, setStaticOnly] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setStaticOnly(prefersLightweight());
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause off-screen so idle tabs cost nothing.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) void v.play().catch(() => undefined);
    else v.pause();
  }, [inView, staticOnly]);

  const showVideo = inView && !staticOnly && !failed;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        className,
      )}
    >
      {/* Static fallback — always painted underneath the clip */}
      <img
        src={video.poster}
        alt={video.label}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {showVideo && (
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          muted
          loop
          autoPlay
          playsInline
          preload="none"
          aria-label={video.label}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent px-2.5 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-medium",
            accent ?? "text-foreground/80",
          )}
        >
          {showVideo ? (
            <>
              <Play className="h-2.5 w-2.5" /> Preview clip
            </>
          ) : (
            <>
              <ImageIcon className="h-2.5 w-2.5" /> Static preview
            </>
          )}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">{video.label}</span>
      </div>
    </div>
  );
}
