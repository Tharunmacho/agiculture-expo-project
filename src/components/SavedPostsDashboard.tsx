import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bookmark, 
  Clock, 
  User, 
  Heart, 
  MessageSquare,
  X,
  BookmarkX
} from 'lucide-react';

interface SavedPost {
  id: string;
  post_id: string;
  created_at: string;
  community_posts: {
    id: string;
    title: string;
    content: string;
    category: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    user_id: string;
  };
}

interface SavedPostsDashboardProps {
  onPostClick: (postId: string) => void;
}

export const SavedPostsDashboard: React.FC<SavedPostsDashboardProps> = ({ onPostClick }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedPosts();
    }
  }, [user]);

  const loadSavedPosts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('id, post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch community posts separately
      if (data && data.length > 0) {
        const postIds = data.map(item => item.post_id);
        const { data: postsData, error: postsError } = await supabase
          .from('community_posts')
          .select('id, title, content, category, created_at, likes_count, comments_count, user_id')
          .in('id', postIds);
          
        if (postsError) throw postsError;
        
        const savedPostsWithDetails = data.map(savedPost => {
          const postDetails = postsData?.find(post => post.id === savedPost.post_id);
          return {
            ...savedPost,
            community_posts: postDetails || {
              id: savedPost.post_id,
              title: 'Post not found',
              content: '',
              category: '',
              created_at: '',
              likes_count: 0,
              comments_count: 0,
              user_id: ''
            }
          };
        });
        
        setSavedPosts(savedPostsWithDetails);
      } else {
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
      toast({
        title: "Error",
        description: "Failed to load saved posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsavePost = async (savedPostId: string, postTitle: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', savedPostId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedPosts(prev => prev.filter(saved => saved.id !== savedPostId));
      toast({
        title: "Success",
        description: `Removed "${postTitle}" from saved posts`,
      });
    } catch (error) {
      console.error('Error unsaving post:', error);
      toast({
        title: "Error",
        description: "Failed to remove post from saved",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Please sign in to view saved posts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          My Saved Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookmarkX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No saved posts yet</p>
            <p className="text-sm mt-1">Save posts to read them later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedPosts.map((savedPost) => (
              <Card 
                key={savedPost.id} 
                className="hover:shadow-md transition-shadow cursor-pointer relative group"
              >
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnsavePost(savedPost.id, savedPost.community_posts.title);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div 
                    className="pr-8"
                    onClick={() => onPostClick(savedPost.post_id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">Anonymous User</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(savedPost.community_posts.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      {savedPost.community_posts.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {savedPost.community_posts.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {savedPost.community_posts.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {savedPost.community_posts.likes_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {savedPost.community_posts.comments_count || 0}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Saved {formatTimeAgo(savedPost.created_at)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};