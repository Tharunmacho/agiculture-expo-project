import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  UserMinus,
  User
} from 'lucide-react';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  role: string;
  is_following: boolean;
  follower_count: number;
  following_count: number;
}

export const UserFollowing: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFollowing();
    }
  }, [user]);

  const loadUsers = async () => {
    if (!user) return;

    try {
      // Get all users with their follow status and counts
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          role
        `)
        .neq('user_id', user.id)
        .eq('profile_completed', true)
        .limit(20);

      if (error) throw error;

      // Get follow status and counts for each user
      const usersWithFollowInfo = await Promise.all(
        (data || []).map(async (profile) => {
          // Check if current user follows this user
          const { data: followData } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.user_id)
            .single();

          // Get follower count
          const { count: followerCount } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.user_id);

          // Get following count
          const { count: followingCount } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.user_id);

          return {
            ...profile,
            is_following: !!followData,
            follower_count: followerCount || 0,
            following_count: followingCount || 0
          };
        })
      );

      setUsers(usersWithFollowInfo);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const loadFollowing = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          following_id,
          profiles!user_follows_following_id_fkey (
            user_id,
            full_name,
            role
          )
        `)
        .eq('follower_id', user.id);

      if (error) throw error;

      const followingUsers = await Promise.all(
        (data || []).map(async (follow: any) => {
          const profile = follow.profiles;
          
          // Get follower count
          const { count: followerCount } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.user_id);

          // Get following count
          const { count: followingCount } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profile.user_id);

          return {
            ...profile,
            is_following: true,
            follower_count: followerCount || 0,
            following_count: followingCount || 0
          };
        })
      );

      setFollowing(followingUsers);
    } catch (error) {
      console.error('Error loading following:', error);
      toast({
        title: "Error",
        description: "Failed to load following list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!user) return;

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Unfollowed user",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Now following user",
        });
      }

      // Refresh both lists
      loadUsers();
      loadFollowing();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'farmer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderUserCard = (userProfile: UserProfile) => (
    <Card key={userProfile.user_id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {userProfile.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">
                {userProfile.full_name || 'Anonymous User'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getRoleBadgeColor(userProfile.role)}`}>
                  {userProfile.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {userProfile.follower_count} followers • {userProfile.following_count} following
                </span>
              </div>
            </div>
          </div>
          
          <Button
            variant={userProfile.is_following ? "outline" : "default"}
            size="sm"
            onClick={() => handleFollowToggle(userProfile.user_id, userProfile.is_following)}
          >
            {userProfile.is_following ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Please sign in to follow users</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Members
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'discover' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab('discover')}
            >
              Discover
            </Button>
            <Button
              variant={activeTab === 'following' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab('following')}
            >
              Following ({following.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'discover' ? (
              users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                users.map(renderUserCard)
              )
            ) : (
              following.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>You're not following anyone yet</p>
                  <p className="text-sm mt-1">Discover and follow community members</p>
                </div>
              ) : (
                following.map(renderUserCard)
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};