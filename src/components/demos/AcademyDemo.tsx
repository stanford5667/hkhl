import { motion } from 'framer-motion';
import { GraduationCap, Play, Pause, Volume2, Maximize, Clock } from 'lucide-react';
import { DEMO_LESSON } from './demoData';
import { DemoCard, DemoCardHeader, DemoVisual } from './DemoCard';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import modThumb from '@/assets/modules/mod-portfolio-construction-v2.jpg';

const R = 26;
const CIRC = 2 * Math.PI * R;

export function AcademyDemo() {
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const pct = Math.round(DEMO_LESSON.progress * 100);
  const shown = useCountUp(pct, true);

  return (
    <DemoCard>
      <DemoCardHeader
        icon={<GraduationCap className="h-4 w-4 text-cyan-400" />}
        category="Academy"
        title="Your learning path"
        subtitle={`${DEMO_LESSON.totalLessons} lessons · self-paced`}
      />

      <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
        {/* Video player mockup — makes the lesson feel like a real video preview */}
        <DemoVisual className="relative overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg">
          {/* Thumbnail */}
          <div className="relative aspect-video w-full">
            <img
              src={modThumb}
              alt={`${DEMO_LESSON.title} preview thumbnail`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* dark vignette for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play overlay */}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="absolute inset-0 flex items-center justify-center group/play"
              aria-label={playing ? 'Pause preview' : 'Play preview'}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm transition-transform group-hover/play:scale-110">
                {playing ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5 text-white" />
                )}
              </span>
            </button>

            {/* Top metadata overlay */}
            <div className="absolute left-0 top-0 w-full p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-400">{DEMO_LESSON.module}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white">{DEMO_LESSON.title}</p>
                </div>
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
              </div>
            </div>

            {/* Bottom controls overlay */}
            <div className="absolute bottom-0 left-0 w-full p-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums text-white/80">2:18</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-cyan-400"
                    initial={reduced ? { width: `${pct}%` } : { width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
                  />
                  <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${pct}%` }} />
                </div>
                <span className="text-[10px] tabular-nums text-white/60">{DEMO_LESSON.duration}</span>
                <Volume2 className="h-3.5 w-3.5 text-white/60" />
                <Maximize className="h-3.5 w-3.5 text-white/60" />
              </div>
            </div>
          </div>
        </DemoVisual>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className={cn("flex items-center gap-1.5", playing && "text-cyan-400")}>
            <Clock className="h-3 w-3" />
            Lesson {DEMO_LESSON.lessonIndex} of {DEMO_LESSON.totalLessons}
          </span>
          <span className="h-3 w-px bg-slate-800" />
          <span>Resume where you left off</span>
        </div>

        <AiInsight text={DEMO_LESSON_INSIGHT} />
      </div>
    </DemoCard>
  );
}

