import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, Clock, Users } from 'lucide-react';

interface TrendingTopic {
  id: string;
  topic: string;
  mention_count: number;
  trend_score: number;
  last_mentioned_at: string;
}

interface TrendingTopicsProps {
  onTopicClick?: (topic: string) => void;
}

export const TrendingTopics: React.FC<TrendingTopicsProps> = ({ onTopicClick }) => {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendColor = (trendScore: number) => {
    if (trendScore > 50) return 'text-red-500';
    if (trendScore > 25) return 'text-orange-500';
    if (trendScore > 10) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTrendIntensity = (trendScore: number) => {
    if (trendScore > 50) return 'Hot';
    if (trendScore > 25) return 'Rising';
    if (trendScore > 10) return 'Popular';
    return 'New';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topics.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No trending topics yet</p>
            <p className="text-sm">Be the first to start a conversation!</p>
          </div>
        ) : (
          topics.map((topic, index) => (
            <div
              key={topic.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onTopicClick?.(topic.topic)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground font-mono text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {topic.topic}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getTrendColor(topic.trend_score)}`}
                    >
                      {getTrendIntensity(topic.trend_score)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {topic.mention_count} mentions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(topic.last_mentioned_at)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold ${getTrendColor(topic.trend_score)}`}>
                  {Math.round(topic.trend_score)}
                </div>
                <TrendingUp className={`h-4 w-4 ${getTrendColor(topic.trend_score)}`} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};