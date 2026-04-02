import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, ArrowLeft, MessageSquare } from 'lucide-react';

interface SharedPostData {
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

export default function SharedPost() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [post, setPost] = useState<SharedPostData | null>(null);
  const [authorName, setAuthorName] = useState('Anonymous');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) return;

    const fetchPost = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('research_posts')
        .select('id, title, content, thumbnail_url, detected_tickers, upvotes, downvotes, comment_count, created_at, user_id')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(data as SharedPostData);

      // Fetch author name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_anonymous')
        .eq('user_id', data.user_id)
        .maybeSingle();

      if (profile && !profile.is_anonymous && profile.full_name) {
        setAuthorName(profile.full_name);
      }

      setLoading(false);
    };

    fetchPost();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-[16/9] rounded-xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-muted-foreground">This article could not be found or the link has expired.</p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const score = post.upvotes - post.downvotes;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <Link to="/community/posts">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              View All Research
            </Button>
          </Link>
          <Badge variant="secondary" className="text-xs">Shared Article</Badge>
        </div>

        {/* Thumbnail */}
        {post.thumbnail_url ? (
          <div className="aspect-[16/9] rounded-xl overflow-hidden">
            <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Title & Meta */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{authorName}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Tickers */}
          {post.detected_tickers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.detected_tickers.map(ticker => (
                <Badge key={ticker} variant="secondary" className="text-xs">${ticker}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-8 prose-headings:mb-3 prose-headings:font-bold prose-p:mb-4 prose-p:leading-relaxed">
          <ReactMarkdown
            components={{
              h2: ({ node, children, ...props }) => (
                <h2 {...props} className="text-xl font-bold mt-8 mb-3 text-foreground">{children}</h2>
              ),
              h3: ({ node, children, ...props }) => (
                <h3 {...props} className="text-lg font-bold mt-6 mb-2 text-foreground">{children}</h3>
              ),
              p: ({ node, children, ...props }) => (
                <p {...props} className="mb-5 leading-relaxed text-foreground/90">{children}</p>
              ),
              img: ({ node, ...props }) => (
                <img {...props} className="rounded-lg border border-border/50 my-6 max-w-full" loading="lazy" />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-4 py-3 border-y border-border/50 text-muted-foreground text-sm">
          <span>{score > 0 ? '+' : ''}{score} votes</span>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span>{post.comment_count} comments</span>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-muted/50 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium">Want to join the discussion and access more research?</p>
          <Link to="/auth">
            <Button>Sign Up Free</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
