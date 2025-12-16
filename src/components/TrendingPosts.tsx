import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageSquare, 
  Clock,
  User,
  Star
} from 'lucide-react';

interface TrendingPost {
  post_id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
  created_at: string;
  view_count: number;
  reaction_count: number;
  comment_count: number;
  trending_score: number;
}

interface TrendingPostsProps {
  onPostClick: (postId: string) => void;
}

export const TrendingPosts: React.FC<TrendingPostsProps> = ({ onPostClick }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadTrendingPosts();
  }, [timeWindow]);

  const loadTrendingPosts = async () => {
    setLoading(true);
    try {
      const intervalMap = {
        '24h': '1 day',
        '7d': '7 days',
        '30d': '30 days'
      };

      const { data, error } = await supabase.rpc('get_trending_posts', {
        time_window: intervalMap[timeWindow],
        limit_count: 10
      });

      if (error) throw error;
      setTrendingPosts(data || []);
    } catch (error) {
      console.error('Error loading trending posts:', error);
      toast({
        title: "Error",
        description: "Failed to load trending posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trackPostView = async (postId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id
        });
    } catch (error) {
      console.error('Error tracking post view:', error);
    }
  };

  const handlePostClick = (postId: string) => {
    trackPostView(postId);
    onPostClick(postId);
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

  const getTrendingIcon = (score: number) => {
    if (score > 100) return <Star className="h-4 w-4 text-yellow-500" />;
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Posts
          </CardTitle>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((period) => (
              <Button
                key={period}
                variant={timeWindow === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeWindow(period)}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : trendingPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No trending posts found for this period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trendingPosts.map((post, index) => (
              <Card 
                key={post.post_id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePostClick(post.post_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      {getTrendingIcon(post.trending_score)}
                    </div>
                    <div className="flex-1">
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
                          {formatTimeAgo(post.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.view_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.reaction_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.comment_count}
                        </div>
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