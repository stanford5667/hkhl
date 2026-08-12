import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, Clock, ImageIcon, Crown, ArrowRight, MessageSquare, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeaturedResearchPosts } from '@/hooks/useResearchPosts';
import type { ResearchPost } from '@/types/community';

const gradients = [
  'from-primary/70 to-cyan-500/60',
  'from-cyan-500/60 to-blue-600/60',
  'from-blue-600/60 to-primary/60',
];

function stripMarkdown(content: string) {
  return content
    .replace(/^TITLE:.*\n\n?/i, '')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[IMAGE:.*?\]/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

function FeaturedCard({ post, index }: { post: ResearchPost; index: number }) {
  const navigate = useNavigate();

  const preview = useMemo(() => stripMarkdown(post.content).slice(0, 160), [post.content]);
  const readMinutes = useMemo(() => {
    const words = post.content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }, [post.content]);

  return (
    <article
      onClick={() => navigate(`/community/posts/${post.id}`)}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-xl border border-white/[0.12] bg-card',
        'transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10'
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={parseThumbnail(post.thumbnail_url)!.src}
            alt={post.title}
            loading="lazy"
            style={{ objectPosition: parseThumbnail(post.thumbnail_url)!.objectPosition }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', gradients[index % gradients.length])}>
            <ImageIcon className="h-8 w-8 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {post.is_premium && (
          <Badge className="absolute left-2 top-2 gap-1 border-0 bg-primary/90 px-1.5 py-0.5 text-[10px] text-primary-foreground">
            <Crown className="h-3 w-3" />
            Premium
          </Badge>
        )}

        {post.detected_tickers?.length > 0 && (
          <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
            {post.detected_tickers.slice(0, 3).map((t) => (
              <Badge key={t} className="border-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
                ${t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary sm:text-base">
          {post.title}
        </h3>
        <p className="line-clamp-3 text-xs text-muted-foreground sm:text-sm">{preview}…</p>

        <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readMinutes} min read
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            {post.upvotes - post.downvotes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {post.comment_count}
          </span>
          <span className="ml-auto shrink-0">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </article>
  );
}

export function FeaturedResearch() {
  const { posts, loading } = useFeaturedResearchPosts(3);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-white/[0.08] bg-card">
            <div className="aspect-[16/9] bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Nothing curated yet — stay quiet rather than showing an empty shell
  if (posts.length === 0) return null;

  return (
    <div>
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="text-cyan-400">Latest</span>{' '}
            <span className="text-foreground">research notes</span>
          </h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">
          Hand-picked write-ups from our analysts — the thesis, the numbers, and how we'd trade it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <FeaturedCard key={post.id} post={post} index={i} />
        ))}
      </div>

      <div className="mt-4">
        <Button asChild variant="outline" size="sm" className="gap-2 border-white/[0.12] bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white">
          <Link to="/community/posts">
            Read all research notes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
