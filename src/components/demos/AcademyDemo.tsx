import { motion } from 'framer-motion';
import { GraduationCap, Play } from 'lucide-react';
import { DEMO_LESSON, DEMO_LESSON_INSIGHT } from './demoData';
import { AiInsight, DemoCard, DemoCardHeader, DemoVisual } from './DemoCard';
import { useCountUp, usePrefersReducedMotion } from './useCountUp';

const R = 26;
const CIRC = 2 * Math.PI * R;

export function AcademyDemo() {
  const reduced = usePrefersReducedMotion();
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
        <DemoVisual className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          {/* Progress ring */}
          <div className="relative h-[68px] w-[68px] flex-shrink-0">
            <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
              <circle cx="34" cy="34" r={R} fill="none" stroke="rgb(30 41 59)" strokeWidth="6" />
              <motion.circle
                cx="34"
                cy="34"
                r={R}
                fill="none"
                stroke="hsl(185 80% 50%)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={reduced ? { strokeDashoffset: CIRC * (1 - DEMO_LESSON.progress) } : { strokeDashoffset: CIRC }}
                whileInView={{ strokeDashoffset: CIRC * (1 - DEMO_LESSON.progress) }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white">
              {Math.round(shown)}%
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400">{DEMO_LESSON.module}</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-white">{DEMO_LESSON.title}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              Lesson {DEMO_LESSON.lessonIndex} of {DEMO_LESSON.totalLessons} · {DEMO_LESSON.duration}
            </p>
          </div>
        </DemoVisual>

        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={reduced ? { width: `${pct}%` } : { width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
            />
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
          >
            <Play className="h-3.5 w-3.5" />
            Resume lesson
          </motion.button>

          <AiInsight text={DEMO_LESSON_INSIGHT} />
        </div>
      </div>
    </DemoCard>
  );
}
