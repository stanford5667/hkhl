import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export type ExistingReview = {
  id: string;
  rating: number | null;
  review: string | null;
  created_at: string;
} | null;

interface CourseReviewFormProps {
  courseId: string;
  userId: string;
  existingReview: ExistingReview;
}

const MAX_REVIEW_LENGTH = 1000;

export function CourseReviewForm({ courseId, userId, existingReview }: CourseReviewFormProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(!existingReview);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState(existingReview?.review ?? '');

  const submit = useMutation({
    mutationFn: async () => {
      const trimmed = text.trim().slice(0, MAX_REVIEW_LENGTH);
      if (rating < 1 || rating > 5) throw new Error('Please pick a rating from 1 to 5 stars.');
      if (!trimmed) throw new Error('Please write a short review.');

      const { error } = await supabase
        .from('course_reviews')
        .upsert(
          { course_id: courseId, user_id: userId, rating, review: trimmed },
          { onConflict: 'course_id,user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      setIsEditing(false);
      toast.success(existingReview ? 'Review updated' : 'Thanks for your review!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (existingReview && !isEditing) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex" aria-label={`Your rating: ${existingReview.rating ?? 0} out of 5`}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < (existingReview.rating ?? 0) ? 'text-yellow-500 fill-current' : 'text-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Your review</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
        {existingReview.review && <p className="text-sm">{existingReview.review}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
      <p className="text-sm font-medium">
        {existingReview ? 'Edit your review' : 'Write a review'}
      </p>

      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                value <= (hoverRating || rating) ? 'text-yellow-500 fill-current' : 'text-muted'
              }`}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_REVIEW_LENGTH}
        rows={4}
        placeholder="What did you learn? What stood out?"
        aria-label="Your review"
      />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? 'Saving...' : existingReview ? 'Save changes' : 'Submit review'}
        </Button>
        {existingReview && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRating(existingReview.rating ?? 0);
              setText(existingReview.review ?? '');
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {text.length}/{MAX_REVIEW_LENGTH}
        </span>
      </div>
    </div>
  );
}
