import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Star, 
  Megaphone, 
  Crown,
  Clock,
  User
} from 'lucide-react';

interface CommunityHighlight {
  id: string;
  post_id: string;
  highlight_type: string;
  priority: number;
  expires_at: string | null;
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
  profiles: {
    full_name: string | null;
    role: string | null;
  } | null;
}

interface CommunityHighlightsProps {
  onPostClick: (postId: string) => void;
}

export const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({ onPostClick }) => {
  const { toast } = useToast();
  const [highlights, setHighlights] = useState<CommunityHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHighlights();
  }, []);

  const loadHighlights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_highlights')
        .select('id, post_id, highlight_type, priority, expires_at, created_at, highlighted_by')
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch community posts
        const postIds = data.map(item => item.post_id);
        const { data: postsData, error: postsError } = await supabase
          .from('community_posts')
          .select('id, title, content, category, created_at, likes_count, comments_count, user_id')
          .in('id', postIds);
          
        if (postsError) throw postsError;

        // Fetch profiles for highlighted_by
        const highlightsWithDetails = await Promise.all(
          data.map(async (highlight) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('user_id', highlight.highlighted_by)
              .single();
            
            const postDetails = postsData?.find(post => post.id === highlight.post_id);
            
            return {
              ...highlight,
              profiles: profile,
              community_posts: postDetails || {
                id: highlight.post_id,
                title: 'Post not found',
                content: '',
                category: '',
                created_at: '',
                likes_count: 0,
                comments_count: 0,
                user_id: ''
              }
            };
          })
        );

        setHighlights(highlightsWithDetails);
      } else {
        setHighlights([]);
      }
    } catch (error) {
      console.error('Error loading highlights:', error);
      toast({
        title: "Error",
        description: "Failed to load community highlights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'featured':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'expert_answer':
        return <Crown className="h-4 w-4 text-purple-500" />;
      default:
        return <Star className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHighlightLabel = (type: string) => {
    switch (type) {
      case 'featured':
        return 'Featured';
      case 'announcement':
        return 'Announcement';
      case 'expert_answer':
        return 'Expert Answer';
      default:
        return 'Highlighted';
    }
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'featured':
        return 'border-yellow-200 bg-yellow-50';
      case 'announcement':
        return 'border-blue-200 bg-blue-50';
      case 'expert_answer':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Community Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (highlights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Community Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No highlights available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Community Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {highlights.map((highlight) => (
            <Card 
              key={highlight.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer border-2 ${getHighlightColor(highlight.highlight_type)}`}
              onClick={() => onPostClick(highlight.post_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    {getHighlightIcon(highlight.highlight_type)}
                    <Badge variant="secondary" className="text-xs">
                      {getHighlightLabel(highlight.highlight_type)}
                    </Badge>
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
                        {formatTimeAgo(highlight.community_posts.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold mb-2 line-clamp-2">
                      {highlight.community_posts.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {highlight.community_posts.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {highlight.community_posts.category}
                      </Badge>
                      
                      {highlight.profiles && (
                        <div className="text-xs text-muted-foreground">
                          Highlighted by{' '}
                          <span className="font-medium">
                            {highlight.profiles.full_name || 'Expert'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};