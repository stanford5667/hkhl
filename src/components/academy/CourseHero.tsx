import type { ReactNode } from 'react';
import { BookOpen, Clock, Layers, Lock, Play, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { prettyLabel } from '@/lib/courseContent';


interface CourseHeroProps {
  title: string;
  headline?: string;
  intro?: string[];
  level?: string | null;
  category?: string | null;
  moduleCount: number;
  lessonCount: number;
  durationLabel?: string | null;
  isFree?: boolean;
  hasAccess: boolean;
  progressPercentage: number;
  onPrimary: () => void;
  primaryLabel: string;
  primaryLoading?: boolean;
  instructorName: string;
  instructorRole: string;
  preview?: ReactNode;
}


const levelStyles: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  advanced: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function MetaItem({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
      <Icon className="w-3.5 h-3.5 text-primary/80" />
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}

export function CourseHero({
  title,
  headline,
  intro = [],
  level,
  category,
  moduleCount,
  lessonCount,
  durationLabel,
  isFree,
  hasAccess,
  progressPercentage,
  onPrimary,
  primaryLabel,
  primaryLoading,
  instructorName,
  instructorRole,
  preview,
}: CourseHeroProps) {

  const initials = instructorName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* Ambient wash */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className="relative p-4 sm:p-7 lg:p-9">
        {/* Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-medium ${levelStyles[level || ''] || 'bg-muted text-muted-foreground'}`}
          >
            {prettyLabel(level) || 'All Levels'}
          </Badge>
          {category && (
            <Badge variant="outline" className="text-[11px] border-border/70 text-muted-foreground">
              {prettyLabel(category)}
            </Badge>
          )}
          {isFree ? (
            <Badge className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Free course
            </Badge>
          ) : (
            !hasAccess && (
              <Badge className="text-[11px] gap-1 bg-primary/15 text-primary border border-primary/30">
                <Lock className="w-3 h-3" />
                Premium
              </Badge>
            )
          )}
        </div>

        {/* Title + headline */}
        <h1 className="mt-3 font-heading text-2xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-foreground">
          {title}
        </h1>
        {headline && (
          <p className="mt-2.5 max-w-2xl text-sm sm:text-lg text-primary/90 font-medium leading-snug">
            {headline}
          </p>
        )}
        {intro.slice(0, 1).map((p) => (
          <p key={p} className="mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {p}
          </p>
        ))}

        {/* Meta strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
          <MetaItem icon={Layers} label={`${moduleCount} modules`} />
          <MetaItem icon={BookOpen} label={`${lessonCount} lessons`} />
          {durationLabel && <MetaItem icon={Clock} label={`${durationLabel} of video`} />}
          
        </div>

        {/* Instructor */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-2.5 sm:p-3 w-fit max-w-full">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{instructorName}</p>
            <p className="truncate text-[11px] sm:text-xs text-muted-foreground">{instructorRole}</p>
          </div>
        </div>

        {/* Preview video placed directly under the instructor block */}
        {preview && <div className="mt-5">{preview}</div>}


        {/* Primary action / progress */}
        <div className="mt-5 space-y-3">
          {hasAccess && (
            <div className="max-w-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Your progress</span>
                <span className="font-semibold text-foreground">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <Button
              size="lg"
              className="h-11 w-full sm:w-auto px-6 font-semibold"
              onClick={onPrimary}
              disabled={primaryLoading}
            >
              {hasAccess ? <Play className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {primaryLoading ? 'Loading…' : primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
