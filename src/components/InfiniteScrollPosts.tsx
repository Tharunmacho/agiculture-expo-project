import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  images: string[] | null;
  likes_count: number | null;
  comments_count: number | null;
  is_resolved: boolean | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
  reactions?: any[];
}

interface InfiniteScrollPostsProps {
  searchQuery?: string;
  selectedCategory?: string;
  onPostClick: (postId: string) => void;
  onReaction: (postId: string, reactionType: string) => void;
  onSavePost: (postId: string) => void;
}

const POSTS_PER_PAGE = 10;

export const InfiniteScrollPosts: React.FC<InfiniteScrollPostsProps> = ({
  searchQuery = '',
  selectedCategory = 'all',
  onPostClick,
  onReaction,
  onSavePost
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const loadPosts = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select(`
          *,
          post_reactions (
            id,
            post_id,
            user_id,
            reaction_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      // Apply filters
      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        if (searchQuery.startsWith('#')) {
          const tag = searchQuery.substring(1);
          query = query.contains('tags', `["${tag}"]`);
        } else {
          query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get profiles for posts
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);

        const postsWithProfiles = data.map(post => ({
          ...post,
          profiles: profiles?.find(p => p.user_id === post.user_id) || null,
          reactions: post.post_reactions || []
        }));

        if (reset) {
          setPosts(postsWithProfiles);
        } else {
          setPosts(prev => [...prev, ...postsWithProfiles]);
        }

        setHasMore(data.length === POSTS_PER_PAGE);
      } else {
        if (reset) setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, loading, toast]);

  // Load initial posts when filters change
  useEffect(() => {
    setPage(0);
    loadPosts(0, true);
  }, [searchQuery, selectedCategory]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPosts]);

  // Record post views when they come into viewport
  const recordPostView = useCallback(async (postId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id,
          session_id: `session_${Date.now()}`,
          ip_address: null
        });
    } catch (error) {
      // Ignore errors for post views to not spam user
      console.log('Error recording post view:', error);
    }
  }, [user]);

  // Intersection Observer for post views tracking
  useEffect(() => {
    const postObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId) {
              recordPostView(postId);
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '0px 0px -100px 0px' }
    );

    // Observe all post elements
    const postElements = document.querySelectorAll('[data-post-id]');
    postElements.forEach(el => postObserver.observe(el));

    return () => postObserver.disconnect();
  }, [posts, recordPostView]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          {searchQuery || selectedCategory !== 'all' 
            ? 'No posts found matching your criteria' 
            : 'No posts yet. Be the first to share!'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <div key={post.id} data-post-id={post.id}>
          <EnhancedPostCard
            post={post}
            onPostClick={() => onPostClick(post.id)}
            onReaction={() => onReaction(post.id, 'like')}
            onPostDeleted={handlePostDeleted}
            compact={false}
          />
        </div>
      ))}
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {/* Intersection observer target */}
      <div ref={observerRef} className="h-4" />
      
      {/* End of posts indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          🎉 You've reached the end! You're all caught up.
        </div>
      )}
    </div>
  );
};