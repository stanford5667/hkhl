import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArticleEmbedProps {
  postId: string;
}

interface ArticleData {
  id: string;
  title: string;
  content: string;
  thumbnail_url: string | null;
  detected_tickers: string[];
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  user_id: string;
}

const gradients = [
  'from-blue-600/80 to-cyan-500/80',
  'from-purple-600/80 to-pink-500/80',
  'from-emerald-600/80 to-teal-500/80',
  'from-orange-600/80 to-amber-500/80',
];

export function ArticleEmbed({ postId }: ArticleEmbedProps) {
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const { data, error } = await supabase
          .from('research_posts')
          .select('id, title, content, thumbnail_url, detected_tickers, upvotes, downvotes, comment_count, created_at, user_id')
          .eq('id', postId)
          .maybeSingle();
        if (error) console.error('ArticleEmbed fetch error:', error);
        setArticle(data);
      } catch (err) {
        console.error('ArticleEmbed error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [postId]);

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-sm rounded-lg border border-border/50 bg-muted/30 animate-pulse">
        <div className="aspect-[2/1] bg-muted rounded-t-lg" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (!article) return null;

  const preview = article.content
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
    .trim()
    .slice(0, 120);

  const gradient = gradients[article.id.charCodeAt(0) % gradients.length];

  return (
    <div
      className={cn(
        "mt-2 w-full max-w-sm rounded-lg border border-border/50 bg-card overflow-hidden cursor-pointer",
        "transition-all duration-200 hover:border-primary/40 hover:shadow-md"
      )}
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/community/posts/${article.id}`);
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2.5/1] overflow-hidden">
        {article.thumbnail_url ? (
          <img
            src={article.thumbnail_url}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", gradient)}>
            <ImageIcon className="h-6 w-6 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {article.detected_tickers.length > 0 && (
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            {article.detected_tickers.slice(0, 3).map((t) => (
              <Badge
                key={t}
                className="bg-black/60 backdrop-blur-sm text-white border-0 text-[9px] px-1 py-0"
              >
                ${t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-semibold leading-tight line-clamp-2">{article.title}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{preview}...</p>
        <p className="text-[10px] text-primary font-medium pt-0.5">📊 Read Full Research Article →</p>
      </div>
    </div>
  );
}

// Utility to extract a post ID from a shared article message
const ARTICLE_LINK_REGEX = /\/community\/posts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function extractArticleId(content: string): string | null {
  const match = content.match(ARTICLE_LINK_REGEX);
  return match ? match[1] : null;
}
