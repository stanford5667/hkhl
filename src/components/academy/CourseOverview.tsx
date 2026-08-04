import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ParsedCourseContent } from '@/lib/courseContent';

interface CourseOverviewProps {
  content: ParsedCourseContent;
  hasAccess: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
}

const FALLBACK_LEARN = [
  'Master fundamental concepts and techniques',
  'Apply strategies in real-world scenarios',
  'Build confidence in your investing decisions',
  'Access practical tools and templates',
];

export function CourseOverview({ content, hasAccess, onSubscribe, isLoading }: CourseOverviewProps) {
  const learn = content.learn.length ? content.learn : FALLBACK_LEARN;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* What you'll learn */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
            What you'll learn
          </h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {learn.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                </span>
                <span className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Intro copy */}
      {content.intro.length > 0 && (
        <Card>
          <CardContent className="space-y-2.5 p-4 sm:p-6">
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
              About this course
            </h2>
            {content.intro.map((p) => (
              <p key={p} className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Parsed sections (instructor, track record, etc.) */}
      {content.sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="p-4 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base sm:text-lg font-semibold text-foreground">
              {section.icon && <span aria-hidden="true">{section.icon}</span>}
              {section.title}
            </h2>
            {section.items.length > 0 && (
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => {
                  const [head, ...rest] = item.split(/\s+[—–]\s+/);
                  const tail = rest.join(' — ');
                  return (
                    <li
                      key={item}
                      className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-xs sm:text-sm"
                    >
                      <span className="font-medium text-foreground">{head}</span>
                      {tail && <span className="text-muted-foreground"> — {tail}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {section.paragraphs.map((p) => (
              <p key={p} className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      ))}

      {!hasAccess && (
        <Card className="border-primary/25 bg-primary/[0.06]">
          <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="flex-1 text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Ready to start?</span> Get the full lesson
              library, tools and community access.
            </p>
            <Button
              className="w-full sm:w-auto"
              size="sm"
              onClick={onSubscribe}
              disabled={isLoading}
            >
              {isLoading ? 'Loading…' : 'Unlock the course'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
