import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface CourseReview {
  id: string;
  rating: number | null;
  review: string | null;
  created_at: string | null;
}

interface TestimonialsSectionProps {
  reviews?: CourseReview[] | null;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Renders real course reviews only. If there are none, renders nothing —
 * no placeholder testimonials, no empty state.
 */
export function TestimonialsSection({ reviews }: TestimonialsSectionProps) {
  const realReviews = (reviews ?? []).filter(
    (r) => (r.review && r.review.trim().length > 0) || (r.rating ?? 0) > 0
  );

  if (realReviews.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Quote className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">What Students Say</h3>
      </div>

      <div className="grid gap-4">
        {realReviews.map((review) => {
          const date = formatDate(review.created_at);
          return (
            <Card key={review.id} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  {(review.rating ?? 0) > 0 && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating ?? 0 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                      ))}
                    </div>
                  )}
                  {date && <p className="text-xs text-muted-foreground">{date}</p>}
                </div>
                {review.review && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    "{review.review}"
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
