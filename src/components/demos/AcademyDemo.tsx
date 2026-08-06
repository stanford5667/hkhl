import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Play, Pause, Volume2, VolumeX, Maximize, Clock, ArrowRight, Crown } from 'lucide-react';
import { DEMO_LESSON } from './demoData';
import { DemoCard } from './DemoCard';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import modThumb from '@/assets/modules/mod-portfolio-construction-v2.jpg';

const R = 26;
const CIRC = 2 * Math.PI * R;
/** Demo preview window, in seconds. */
const PREVIEW_LIMIT = 120;
/** Start the demo preview at this timestamp. */
const PREVIEW_START = 4;


const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

export function AcademyDemo() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const pct = Math.round(DEMO_LESSON.progress * 100);
  const shown = useCountUp(pct, true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('course_lessons')
        .select('title, video_url')
        .eq('is_preview', true)
        .not('video_url', 'is', null)
        .ilike('title', 'Our Strategy')
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.video_url) {
        setPreview({ title: data.title, url: data.video_url });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) {
      navigate('/academy');
      return;
    }
    if (el.paused) {
      el.play().catch(() => navigate('/academy'));
    } else {
      el.pause();
    }
  };

  const remaining = Math.max(0, PREVIEW_LIMIT - current);


  return (
    <DemoCard className="overflow-hidden">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <GraduationCap className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-400/70">
                Academy
              </p>
              <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
                Investment Masterclass
              </h3>
            </div>
          </div>
        </div>

        {/* Course hero copy */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium leading-relaxed text-cyan-300/90">
            Find the Next Big Trade Before Everyone Else
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Get early access to proprietary trade setups and institutional-grade investment research
            — the kind of ideas the crowd only sees after the move is made.
          </p>
        </div>

        {/* Meta + instructor */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              CS
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-foreground">Chris Stanford</p>
              <p className="truncate text-[10px] text-muted-foreground">Hedge Fund Manager</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              4 modules
            </span>
            <span className="h-3 w-px bg-slate-800" />
            <span>92 lessons</span>
          </div>
        </div>

        {/* Video preview player */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg">
          <div className="relative aspect-video w-full">
            {preview ? (
              <video
                ref={videoRef}
                src={preview.url}
                poster={modThumb}
                muted={muted}
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setCurrent(el.currentTime);
                  if (el.currentTime >= PREVIEW_LIMIT) {
                    el.pause();
                    el.currentTime = 0;
                  }
                }}
              />
            ) : (
              <img
                src={modThumb}
                alt={`${DEMO_LESSON.title} preview thumbnail`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity',
                playing && 'opacity-0'
              )}
            />

            {/* FREE PREVIEW badge */}
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-950 shadow-lg">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Free Preview
              </span>
            </div>

            {/* Remaining counter */}
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                {fmt(remaining)} left
              </span>
            </div>

            {/* Play overlay */}
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group/play"
              aria-label={playing ? 'Pause preview' : 'Play preview'}
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm transition-all group-hover/play:scale-110',
                  playing && 'opacity-0 group-hover/play:opacity-100'
                )}
              >
                {playing ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5 text-white" />
                )}
              </span>
            </button>

            {/* Bottom progress overlay */}
            <div className="absolute bottom-0 left-0 w-full p-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums text-white/80">{fmt(current)}</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 transition-[width] duration-200"
                    style={{ width: `${Math.min(100, (current / PREVIEW_LIMIT) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-white/60">{fmt(PREVIEW_LIMIT)}</span>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute preview' : 'Mute preview'}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => videoRef.current?.requestFullscreen?.()}
                  aria-label="Fullscreen"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  <Maximize className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Current lesson */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
              <circle cx="34" cy="34" r={R} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="5" />
              <motion.circle
                cx="34"
                cy="34"
                r={R}
                fill="none"
                stroke="hsl(185 80% 50%)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={reduced ? { strokeDashoffset: CIRC * (1 - DEMO_LESSON.progress) } : { strokeDashoffset: CIRC }}
                whileInView={{ strokeDashoffset: CIRC * (1 - DEMO_LESSON.progress) }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute text-[9px] font-bold text-white">{Math.round(shown)}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Lesson {DEMO_LESSON.lessonIndex} of {DEMO_LESSON.totalLessons}
            </p>
            <p className="truncate text-[12px] font-semibold text-foreground">{DEMO_LESSON.title}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-slate-700 bg-slate-900/50 text-[11px] font-medium hover:bg-slate-800 hover:text-foreground"
              onClick={() => navigate('/academy')}
            >
              Watch in player
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-9 bg-gradient-to-r from-cyan-500 to-blue-600 text-[11px] font-semibold text-white hover:from-cyan-400 hover:to-blue-500"
              onClick={() => navigate('/academy')}
            >
              <Crown className="h-3 w-3" />
              Upgrade to Pro
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            onClick={() => navigate('/academy')}
          >
            Unlock all 92 lessons — from $83/mo
          </Button>
        </div>
      </div>
    </DemoCard>
  );
}
