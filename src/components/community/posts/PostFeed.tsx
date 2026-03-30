import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostSortOption, PostTimeFilter } from '@/types/community';
import { useResearchPosts } from '@/hooks/useResearchPosts';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Flame, Clock, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function PostFeed() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    posts,
    loading,
    hasMore,
    sortBy,
    setSortBy,
    timeFilter,
    setTimeFilter,
    tickerFilter,
    setTickerFilter,
    vote,
    deletePost,
    loadMore,
  } = useResearchPosts();

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(post =>
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      post.detected_tickers.some(t => t.toLowerCase().includes(query))
    );
  }, [posts, searchQuery]);

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    try {
      await vote(postId, voteType);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const sortOptions: { value: PostSortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'hot', label: 'Hot', icon: <Flame className="h-3.5 w-3.5" /> },
    { value: 'new', label: 'Latest', icon: <Clock className="h-3.5 w-3.5" /> },
    { value: 'top', label: 'Top', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Research Feed</h2>
          <p className="text-sm text-muted-foreground">Community insights and analysis</p>
        </div>

        {isAuthenticated && (
          <Button onClick={() => navigate('/community/new-post')} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={sortBy === opt.value ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setSortBy(opt.value)}
            >
              {opt.icon}
              {opt.label}
            </Button>
          ))}

          {sortBy === 'top' && (
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as PostTimeFilter)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          )}

          {tickerFilter && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => setTickerFilter(null)}
            >
              ${tickerFilter}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      {loading && filteredPosts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <Skeleton className="aspect-[16/9]" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium">No posts found</p>
          <p className="text-sm mt-1">Be the first to share your research!</p>
          {isAuthenticated && (
            <Button className="mt-4 gap-2" onClick={() => navigate('/community/new-post')}>
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onVote={handleVote}
                onTickerClick={setTickerFilter}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
                className="min-w-[140px]"
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
