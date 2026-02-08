import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ResearchPost, PostComment, PostSortOption, PostTimeFilter } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { extractTickers } from '@/utils/tickerParser';

const POSTS_PER_PAGE = 20;

export function useResearchPosts() {
  const [posts, setPosts] = useState<ResearchPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<PostSortOption>('hot');
  const [timeFilter, setTimeFilter] = useState<PostTimeFilter>('week');
  const [tickerFilter, setTickerFilter] = useState<string | null>(null);
  const { user } = useAuth();

  const calculateHotScore = (post: ResearchPost): number => {
    const score = post.upvotes - post.downvotes;
    const hoursAgo = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    // Reddit-style hot score with time decay
    return score / Math.pow(hoursAgo + 2, 1.5);
  };

  const fetchPosts = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('research_posts')
        .select('*')
        .range(offset, offset + POSTS_PER_PAGE - 1);

      // Apply time filter for "top" sort
      if (sortBy === 'top' && timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (timeFilter) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply ticker filter
      if (tickerFilter) {
        query = query.contains('detected_tickers', [tickerFilter]);
      }

      // Apply sorting
      if (sortBy === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'top') {
        query = query.order('upvotes', { ascending: false });
      } else {
        // For 'hot', we'll sort client-side after fetching
        query = query.order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let fetchedPosts = (data || []) as ResearchPost[];

      // Client-side "hot" sorting
      if (sortBy === 'hot') {
        fetchedPosts = fetchedPosts.sort((a, b) => 
          calculateHotScore(b) - calculateHotScore(a)
        );
      }

      // Fetch user votes if authenticated
      if (user && fetchedPosts.length > 0) {
        const { data: votes } = await supabase
          .from('post_votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id)
          .in('post_id', fetchedPosts.map(p => p.id));

        if (votes) {
          const voteMap = new Map(votes.map(v => [v.post_id, v.vote_type]));
          fetchedPosts = fetchedPosts.map(post => ({
            ...post,
            user_vote: voteMap.get(post.id) || null,
          }));
        }
      }

      if (offset === 0) {
        setPosts(fetchedPosts);
      } else {
        setPosts(prev => [...prev, ...fetchedPosts]);
      }

      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortBy, timeFilter, tickerFilter, user]);

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  const createPost = async (title: string, content: string) => {
    if (!user) throw new Error('Must be authenticated');

    const detectedTickers = extractTickers(title + ' ' + content);

    const { data, error } = await supabase
      .from('research_posts')
      .insert({
        user_id: user.id,
        title,
        content,
        detected_tickers: detectedTickers,
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh posts
    await fetchPosts(0);
    return data as ResearchPost;
  };

  const updatePost = async (postId: string, title: string, content: string) => {
    if (!user) throw new Error('Must be authenticated');

    const detectedTickers = extractTickers(title + ' ' + content);

    const { error } = await supabase
      .from('research_posts')
      .update({
        title,
        content,
        detected_tickers: detectedTickers,
      })
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Refresh posts
    await fetchPosts(0);
  };

  const deletePost = async (postId: string) => {
    if (!user) throw new Error('Must be authenticated');

    const { error } = await supabase
      .from('research_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;

    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const vote = async (postId: string, voteType: 1 | -1) => {
    if (!user) throw new Error('Must be authenticated');

    const existingVote = posts.find(p => p.id === postId)?.user_vote;

    // Optimistic update
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;

        let upvotes = post.upvotes;
        let downvotes = post.downvotes;

        // Remove old vote effect
        if (existingVote === 1) upvotes--;
        if (existingVote === -1) downvotes--;

        // If clicking same vote, just remove it
        if (existingVote === voteType) {
          return { ...post, upvotes, downvotes, user_vote: null };
        }

        // Add new vote effect
        if (voteType === 1) upvotes++;
        if (voteType === -1) downvotes++;

        return { ...post, upvotes, downvotes, user_vote: voteType };
      })
    );

    try {
      if (existingVote === voteType) {
        // Remove vote
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else if (existingVote) {
        // Update vote
        await supabase
          .from('post_votes')
          .update({ vote_type: voteType })
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Insert new vote
        await supabase
          .from('post_votes')
          .insert({
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          });
      }
    } catch (err) {
      // Revert on error
      await fetchPosts(0);
      throw err;
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    fetchPosts(posts.length);
  };

  return {
    posts,
    loading,
    hasMore,
    error,
    sortBy,
    setSortBy,
    timeFilter,
    setTimeFilter,
    tickerFilter,
    setTickerFilter,
    createPost,
    updatePost,
    deletePost,
    vote,
    loadMore,
    refreshPosts: () => fetchPosts(0),
  };
}

// Hook for single post with comments
export function usePostDetail(postId: string | null) {
  const [post, setPost] = useState<ResearchPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPost = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: postData, error: postError } = await supabase
        .from('research_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Fetch user vote
      if (user) {
        const { data: voteData } = await supabase
          .from('post_votes')
          .select('vote_type')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();

        (postData as ResearchPost).user_vote = voteData?.vote_type || null;
      }

      setPost(postData as ResearchPost);

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Build comment tree
      const commentMap = new Map<string, PostComment>();
      const rootComments: PostComment[] = [];

      (commentsData || []).forEach((comment: PostComment) => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });

      (commentsData || []).forEach((comment: PostComment) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentMap.get(comment.id)!);
          }
        } else {
          rootComments.push(commentMap.get(comment.id)!);
        }
      });

      setComments(rootComments);
    } catch (err: any) {
      console.error('Error fetching post:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const addComment = async (content: string, parentId?: string) => {
    if (!user || !postId) throw new Error('Must be authenticated');

    const detectedTickers = extractTickers(content);

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
        detected_tickers: detectedTickers,
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh comments
    await fetchPost();
    return data as PostComment;
  };

  const deleteComment = async (commentId: string) => {
    if (!user) throw new Error('Must be authenticated');

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    await fetchPost();
  };

  return {
    post,
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refresh: fetchPost,
  };
}
