import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, Play, Pause, Volume2, VolumeX, Maximize, Clock, ArrowRight, Crown, ChevronDown, Lock, Search } from 'lucide-react';
import { DEMO_LESSON } from './demoData';
import { DemoCard } from './DemoCard';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import modThumb from '@/assets/modules/mod-portfolio-construction-v2.jpg';

const R = 26;
const CIRC = 2 * Math.PI * R;
/** Demo preview window end, in seconds. */
const PREVIEW_LIMIT = 720;
/** Start the demo preview at this timestamp. */
const PREVIEW_START = 600;


const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

type LessonItem = {
  id: string;
  moduleId: string;
  title: string;
  duration: string;
  description: string;
  locked: boolean;
  isPreview: boolean;
  orderIndex: number;
};

type CourseSection = {
  id: string;
  title: string;
  orderIndex: number;
  lessons: LessonItem[];
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

const FALLBACK_SECTIONS: CourseSection[] = [
  {
    id: 'm1',
    title: 'Portfolio Management',
    orderIndex: 0,
    lessons: [
      {
        id: 'l1',
        moduleId: 'm1',
        title: 'How the Pros Find Ideas',
        duration: '12 min',
        description: 'The same screen hedge funds run every Monday morning: liquidity, momentum, and catalyst filters.',
        locked: false,
        isPreview: true,
        orderIndex: 0,
      },
      {
        id: 'l2',
        moduleId: 'm1',
        title: 'Reading the Macro Map',
        duration: '16 min',
        description: 'Rates, credit, and earnings revisions — the three inputs that drive 80% of market direction.',
        locked: true,
        isPreview: false,
        orderIndex: 1,
      },
    ],
  },
  {
    id: 'm2',
    title: 'Options Trading',
    orderIndex: 1,
    lessons: [
      {
        id: 'l3',
        moduleId: 'm2',
        title: 'Backtesting a Real Strategy',
        duration: '22 min',
        description: 'Build a rules-based strategy, test it across 30+ years, and interpret the Sharpe and drawdown.',
        locked: true,
        isPreview: false,
        orderIndex: 0,
      },
    ],
  },
  {
    id: 'm3',
    title: 'Stock Market',
    orderIndex: 2,
    lessons: [
      {
        id: 'l4',
        moduleId: 'm3',
        title: 'Position Sizing & Risk',
        duration: '14 min',
        description: 'Why the best idea can still ruin a portfolio if sizing is wrong.',
        locked: true,
        isPreview: false,
        orderIndex: 0,
      },
    ],
  },
  {
    id: 'm4',
    title: 'Financial Accounting',
    orderIndex: 3,
    lessons: [
      {
        id: 'l5',
        moduleId: 'm4',
        title: 'The Options Overlay',
        duration: '19 min',
        description: 'Use defined-risk options to express the same thesis with less capital.',
        locked: true,
        isPreview: false,
        orderIndex: 0,
      },
      {
        id: 'l6',
        moduleId: 'm4',
        title: 'Putting It All Together',
        duration: '25 min',
        description: 'A live walkthrough of a full playbook from idea to tested position.',
        locked: true,
        isPreview: false,
        orderIndex: 1,
      },
    ],
  },
];

function useCourseSections() {
  return useQuery({
    queryKey: ['academy-demo-sections'],
    queryFn: async (): Promise<CourseSection[] | null> => {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1);
      const course = courses?.[0];
      if (!course) return null;

      const { data: modules } = await supabase
        .from('course_modules')
        .select('id, title, order_index')
        .eq('course_id', course.id)
        .order('order_index', { ascending: true });
      const moduleIds = modules?.map((m) => m.id) || [];

      const { data: lessons } = await supabase
        .from('course_lessons')
        .select('id, title, module_id, order_index, video_duration, description, is_preview')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });

      return (modules || []).map((m) => {
        const moduleLessons = (lessons || []).filter((l) => l.module_id === m.id);
        return {
          id: m.id,
          title: m.title,
          orderIndex: m.order_index,
          lessons: moduleLessons.map((l, i) => ({
            id: l.id,
            moduleId: m.id,
            title: l.title,
            orderIndex: l.order_index ?? i,
            duration: formatDuration(l.video_duration),
            description: l.description || 'Detailed lesson walkthrough.',
            locked: !l.is_preview,
            isPreview: !!l.is_preview,
          })),
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}


export function AcademyDemo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedShowAll, setExpandedShowAll] = useState<Set<string>>(new Set());
  const { data: courseSections } = useCourseSections();
  const sections = courseSections ?? FALLBACK_SECTIONS;
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const previewCount = sections.flatMap((s) => s.lessons).filter((l) => l.isPreview).length;
  const pct = Math.round(DEMO_LESSON.progress * 100);


  const goToAuth = () => navigate('/auth', { state: { mode: 'signup' } });

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

  useEffect(() => {
    if (sections.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set([sections[0].id]));
    }
  }, [sections]);


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
              {sections.length} modules
            </span>
            <span className="h-3 w-px bg-slate-800" />
            <span>{totalLessons} lessons</span>
          </div>

        </div>

        {/* Video preview player */}
        <div data-guest-allow className="relative overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg">
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
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  el.currentTime = PREVIEW_START;
                  setCurrent(PREVIEW_START);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setCurrent(el.currentTime);
                  if (el.currentTime >= PREVIEW_LIMIT) {
                    el.pause();
                    el.currentTime = PREVIEW_START;
                    setCurrent(PREVIEW_START);
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

        {/* Course content preview */}
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-slate-800/80">
            <span className="pb-2 text-[11px] font-semibold text-foreground border-b border-cyan-400">
              Curriculum
            </span>
            <span className="pb-2 text-[11px] text-muted-foreground">Overview</span>
            <span className="pb-2 text-[11px] text-muted-foreground">Reviews (0)</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Course content</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {sections.length} modules • {totalLessons} lessons • {previewCount} lessons open for a short free preview
            </p>
          </div>

          {/* Search */}
          <div
            onClick={() => !user && goToAuth()}
            className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-[11px] text-muted-foreground cursor-pointer hover:bg-slate-900/60 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search lessons...</span>
          </div>

          {/* Modules */}
          <div className="flex flex-col gap-2">
            {sections.map((section, sectionIdx) => {
              const moduleNum = sectionIdx + 1;
              const isExpanded = expandedModules.has(section.id);
              const isShowAll = expandedShowAll.has(section.id);
              const visibleLessons = isShowAll ? section.lessons : section.lessons.slice(0, 2);
              const hiddenCount = section.lessons.length - visibleLessons.length;

              return (
                <div key={section.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        goToAuth();
                        return;
                      }
                      setExpandedModules((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      });
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white">
                      {moduleNum}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{section.title}</p>
                      <p className="text-[10px] text-muted-foreground">{section.lessons.length} lessons</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800/80">
                      {visibleLessons.map((lesson) => {
                        const lessonNum = `${moduleNum}.${lesson.orderIndex + 1}`;
                        return (
                          <div
                            key={lesson.id}
                            {...(lesson.isPreview ? { 'data-guest-allow': true } : {})}
                            onClick={() => {
                              if (lesson.isPreview) {
                                void playPreviewLesson(lesson.id);
                                return;
                              }
                              user ? navigate('/academy') : goToAuth();
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-900/60 cursor-pointer transition-colors"
                          >
                            <Play className="h-3 w-3 shrink-0 text-slate-500" />

                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-foreground truncate">
                                {lessonNum} {lesson.title}
                              </p>
                            </div>
                            {lesson.isPreview ? (
                              <span className="shrink-0 rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400">
                                Free preview
                              </span>
                            ) : (
                              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                        );
                      })}

                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              goToAuth();
                              return;
                            }
                            setExpandedShowAll((prev) => {
                              const next = new Set(prev);
                              if (next.has(section.id)) next.delete(section.id);
                              else next.add(section.id);
                              return next;
                            });
                          }}
                          className="flex h-8 w-full items-center justify-center gap-1 border-t border-slate-800/80 text-[10px] font-medium text-cyan-400 transition-colors hover:bg-cyan-500/5"
                        >
                          Show {hiddenCount} more {hiddenCount === 1 ? 'lesson' : 'lessons'}
                          <ChevronDown
                            className={cn('h-3 w-3 transition-transform', isShowAll && 'rotate-180')}
                          />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-slate-700 bg-slate-900/50 text-[11px] font-medium hover:bg-slate-800 hover:text-foreground"
              onClick={() => (user ? navigate('/academy') : goToAuth())}
            >
              Watch in player
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-9 bg-gradient-to-r from-cyan-500 to-blue-600 text-[11px] font-semibold text-white hover:from-cyan-400 hover:to-blue-500"
              onClick={() => (user ? navigate('/academy') : goToAuth())}
            >
              <Crown className="h-3 w-3" />
              Upgrade to Pro
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            onClick={() => (user ? navigate('/academy') : goToAuth())}
          >
            Unlock all {totalLessons} lessons — from $83/mo
          </Button>
        </div>
      </div>
    </DemoCard>
  );
}
