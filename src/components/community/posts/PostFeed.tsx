import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResearchPost, PostSortOption, PostTimeFilter } from '@/types/community';
import { useResearchPosts } from '@/hooks/useResearchPosts';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Search, Flame, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
    loadMore,
  } = useResearchPosts();

  // Filter posts by search query
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

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isAuthenticated && (
          <Button onClick={() => navigate('/community/new-post')} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Post</span>
          </Button>
        )}
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as PostSortOption)}>
          <TabsList>
            <TabsTrigger value="hot" className="gap-1.5">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Top</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {sortBy === 'top' && (
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as PostTimeFilter)}>
            <SelectTrigger className="w-[120px]">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTickerFilter(null)}
            className="gap-1"
          >
            ${tickerFilter}
            <span className="ml-1">×</span>
          </Button>
        )}
      </div>

      {/* Posts list */}
      <div className="space-y-4">
        {loading && filteredPosts.length === 0 ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No posts found</p>
            <p className="text-sm">Be the first to share your research!</p>
          </div>
        ) : (
          <>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onVote={handleVote}
                onTickerClick={setTickerFilter}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
