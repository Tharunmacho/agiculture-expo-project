import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Heart, 
  MessageSquare, 
  Share2, 
  UserPlus, 
  Star,
  Bookmark,
  Eye,
  TrendingUp
} from 'lucide-react';

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  target_type: string;
  target_id: string;
  created_at: string;
  metadata?: any;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
  target_data?: any;
}

interface UserActivityFeedProps {
  userId?: string; // If provided, show activities for specific user
  followingOnly?: boolean; // Show only activities from followed users
  limit?: number;
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  userId,
  followingOnly = false,
  limit = 20
}) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadActivityFeed();
      setupRealTimeUpdates();
    }
  }, [user, userId, followingOnly]);

  const loadActivityFeed = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by specific user if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Filter by following users only
      if (followingOnly && user?.id) {
        const { data: following } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds);
        } else {
          setActivities([]);
          setLoading(false);
          return;
        }
      }

      const { data: activityData, error } = await query;
      if (error) throw error;

      // Get user profiles for activities
      const userIds = [...new Set(activityData?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', userIds);

      // Get target data (posts, comments, etc.) for context
      const activitiesWithData = await Promise.all(
        (activityData || []).map(async (activity) => {
          let targetData = null;
          
          try {
            if (activity.target_type === 'post') {
              const { data } = await supabase
                .from('community_posts')
                .select('id, title, category')
                .eq('id', activity.target_id)
                .single();
              targetData = data;
            } else if (activity.target_type === 'comment') {
              const { data } = await supabase
                .from('post_comments')
                .select('id, content, post_id')
                .eq('id', activity.target_id)
                .single();
              targetData = data;
            }
          } catch (error) {
            console.log('Error loading target data:', error);
          }

          return {
            ...activity,
            profiles: profiles?.find(p => p.user_id === activity.user_id) || null,
            target_data: targetData
          };
        })
      );

      setActivities(activitiesWithData);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const channel = supabase
      .channel('activity_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activity_feed'
        },
        () => {
          loadActivityFeed(); // Reload when new activity is added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'like':
      case 'reaction':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'share':
        return <Share2 className="h-4 w-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'helpful':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'bookmark':
        return <Bookmark className="h-4 w-4 text-indigo-500" />;
      case 'view':
        return <Eye className="h-4 w-4 text-gray-500" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const userName = activity.profiles?.full_name || 'Someone';
    const targetTitle = activity.target_data?.title || 'a post';
    
    switch (activity.activity_type) {
      case 'like':
        return `${userName} liked "${targetTitle}"`;
      case 'comment':
        return `${userName} commented on "${targetTitle}"`;
      case 'share':
        return `${userName} shared "${targetTitle}"`;
      case 'follow':
        return `${userName} started following you`;
      case 'helpful':
        return `${userName} marked "${targetTitle}" as helpful`;
      case 'bookmark':
        return `${userName} bookmarked "${targetTitle}"`;
      case 'view':
        return `${userName} viewed "${targetTitle}"`;
      case 'post':
        return `${userName} created a new post: "${targetTitle}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'expert': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading activity feed...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {followingOnly ? 'Following Activity' : 'Recent Activity'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              {followingOnly && (
                <p className="text-sm mt-1">
                  Follow other users to see their activity here
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={getRoleBadgeColor(activity.profiles?.role)}>
                          {activity.profiles?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {getActivityText(activity)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                        
                        {activity.profiles?.role && (
                          <Badge variant="outline" className="text-xs">
                            {activity.profiles.role}
                          </Badge>
                        )}
                        
                        {activity.target_data?.category && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.target_data.category}
                          </Badge>
                        )}
                      </div>
                      
                      {activity.metadata && activity.metadata.platform && (
                        <div className="text-xs text-muted-foreground mt-1">
                          via {activity.metadata.platform}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};