import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, TrendingUp, MessageSquare, Users, Crown } from 'lucide-react';

interface HashtagData {
  tag: string;
  count: number;
  trend_score: number;
  recent_posts: string[];
  growth_rate?: number;
}

interface TrendingHashtagsProps {
  onTagClick?: (tag: string) => void;
  limit?: number;
}

export const TrendingHashtagsSidebar: React.FC<TrendingHashtagsProps> = ({
  onTagClick,
  limit = 15
}) => {
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadTrendingHashtags();
  }, [timeFrame]);

  const loadTrendingHashtags = async () => {
    setLoading(true);
    try {
      // Get posts from the selected time frame
      const timeFilter = getTimeFilter(timeFrame);
      const { data: posts, error } = await supabase
        .from('community_posts')
        .select('tags, created_at, id')
        .gte('created_at', timeFilter)
        .not('tags', 'is', null);

      if (error) throw error;

      // Process hashtags
      const hashtagStats = new Map<string, HashtagData>();

      posts?.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            const tagName = tag.toLowerCase().trim();
            if (!tagName) return;

            const existing = hashtagStats.get(tagName) || {
              tag: tagName,
              count: 0,
              trend_score: 0,
              recent_posts: []
            };

            existing.count++;
            existing.recent_posts.push(post.id);
            
            // Calculate trend score based on recency and frequency
            const hoursSincePost = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
            const recencyBonus = Math.max(0, 48 - hoursSincePost) / 48; // Bonus for recent posts
            existing.trend_score += 1 + recencyBonus;

            hashtagStats.set(tagName, existing);
          });
        }
      });

      // Calculate growth rates for trending hashtags
      const hashtagsArray = Array.from(hashtagStats.values());
      
      // Sort by trend score and limit results
      const sortedHashtags = hashtagsArray
        .filter(h => h.count >= 2) // Minimum 2 uses to be trending
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(0, limit);

      setHashtags(sortedHashtags);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFilter = (timeFrame: string) => {
    const now = new Date();
    switch (timeFrame) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getTrendingIcon = (index: number) => {
    if (index === 0) return <Crown className="h-3 w-3 text-yellow-500" />;
    if (index < 3) return <TrendingUp className="h-3 w-3 text-orange-500" />;
    return <Hash className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendingIntensity = (trendScore: number) => {
    if (trendScore > 20) return { label: 'Hot', color: 'bg-red-500' };
    if (trendScore > 10) return { label: 'Rising', color: 'bg-orange-500' };
    if (trendScore > 5) return { label: 'Popular', color: 'bg-blue-500' };
    return { label: 'New', color: 'bg-green-500' };
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Trending Hashtags
        </CardTitle>
        
        {/* Time Frame Selector */}
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as const).map((period) => (
            <Button
              key={period}
              variant={timeFrame === period ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFrame(period)}
              className="text-xs h-7 px-2"
            >
              {period}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading trends...
            </div>
          ) : hashtags.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No trending hashtags yet</p>
              <p className="text-xs mt-1">Start using hashtags in your posts!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {hashtags.map((hashtag, index) => {
                const intensity = getTrendingIntensity(hashtag.trend_score);
                
                return (
                  <div
                    key={hashtag.tag}
                    className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => onTagClick?.(hashtag.tag)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                          {getTrendingIcon(index)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">
                            #{hashtag.tag}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {hashtag.count} posts
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs text-white ${intensity.color}`}
                            >
                              {intensity.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xs font-medium text-primary">
                          {Math.round(hashtag.trend_score)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          score
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Trending Categories */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Popular Topics
                </h4>
                <div className="flex flex-wrap gap-1">
                  {['rice', 'wheat', 'organic', 'irrigation', 'harvest', 'pest'].map(topic => (
                    <Button
                      key={topic}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onTagClick?.(topic)}
                    >
                      #{topic}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};