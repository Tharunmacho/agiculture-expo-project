import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  UserPlus, 
  UserMinus, 
  MapPin, 
  Calendar, 
  Award,
  MessageCircle,
  ThumbsUp,
  Star,
  Briefcase,
  GraduationCap,
  Users
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string | null;
  district: string | null;
  state: string | null;
  crop_types: string[] | null;
  created_at: string;
  expert_network?: {
    id: string;
    specialization: string;
    experience_years: number;
    rating: number;
    total_consultations: number;
    bio: string | null;
  };
  user_reputation?: {
    total_points: number;
    level: number;
    posts_count: number;
    helpful_answers: number;
    best_answers: number;
  };
}

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose
}) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      loadUserProfile();
      checkFollowStatus();
    }
  }, [userId, isOpen]);

  const loadUserProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch expert network data if available
      const { data: expertData } = await supabase
        .from('expert_network')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch user reputation
      const { data: reputationData } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();

      setProfile({
        ...profileData,
        expert_network: expertData || undefined,
        user_reputation: reputationData || undefined
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser?.id || !userId) return;

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      // No follow relationship exists
      setIsFollowing(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.id || !userId) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${profile?.full_name || 'this user'}`,
        });
      } else {
        // Follow
        await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });

        setIsFollowing(true);
        toast({
          title: "Following",
          description: `You are now following ${profile?.full_name || 'this user'}`,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'expert': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (!profile && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className={`text-2xl ${getRoleBadgeColor(profile.role)}`}>
                  {profile.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">
                    {profile.full_name || 'Anonymous User'}
                  </h2>
                  {profile.role && (
                    <Badge variant="secondary" className="capitalize">
                      {profile.role}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  {profile.district && profile.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.district}, {profile.state}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {formatJoinDate(profile.created_at)}
                  </div>
                </div>

                {currentUser?.id !== userId && (
                  <div className="mt-4">
                    <Button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className="gap-2"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Stats Section */}
            {profile.user_reputation && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {profile.user_reputation.total_points}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reputation Points
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <MessageCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {profile.user_reputation.posts_count}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Posts
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <ThumbsUp className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {profile.user_reputation.helpful_answers}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Helpful Answers
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {profile.user_reputation.best_answers}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Best Answers
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expert Information */}
            {profile.expert_network && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Expert Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Specialization</span>
                      </div>
                      <p className="text-muted-foreground">
                        {profile.expert_network.specialization}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Experience</span>
                      </div>
                      <p className="text-muted-foreground">
                        {profile.expert_network.experience_years} years
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Rating</span>
                      </div>
                      <p className="text-muted-foreground">
                        {profile.expert_network.rating.toFixed(1)}/5.0
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Consultations</span>
                      </div>
                      <p className="text-muted-foreground">
                        {profile.expert_network.total_consultations} completed
                      </p>
                    </div>
                  </div>

                  {profile.expert_network.bio && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bio</span>
                      </div>
                      <p className="text-muted-foreground">
                        {profile.expert_network.bio}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Crop Types */}
            {profile.crop_types && profile.crop_types.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Crop Specialties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.crop_types.map((crop, index) => (
                      <Badge key={index} variant="outline">
                        {crop}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};