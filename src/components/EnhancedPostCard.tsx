import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PostReporting } from '@/components/PostReporting';
import { PostAnalytics } from '@/components/PostAnalytics';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle,
  ThumbsUp,
  HelpCircle,
  Trash2,
  Edit,
  Flag,
  BarChart3,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: {
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
    reactions?: Array<{
      id: string;
      reaction_type: string;
      user_id: string;
    }>;
  };
  onPostClick?: (post: any) => void;
  onReaction?: () => void;
  onPostDeleted?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  compact?: boolean;
}

export const EnhancedPostCard: React.FC<PostCardProps> = ({ 
  post, 
  onPostClick, 
  onReaction,
  onPostDeleted,
  onUserClick,
  compact = false 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(Math.floor(Math.random() * 100) + 10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleReaction = async (reactionType: string) => {
    if (!user?.id) return;

    try {
      // Check if user already reacted
      const existingReaction = post.reactions?.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('post_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reactionType,
          });
      }

      onReaction?.();
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleBookmark = async () => {
    if (!user?.id) return;

    try {
      if (isBookmarked) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        setIsBookmarked(false);
      } else {
        await supabase
          .from('saved_posts')
          .insert({
            post_id: post.id,
            user_id: user.id,
          });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleShare = async () => {
    try {
      await supabase
        .from('post_shares')
        .insert({
          post_id: post.id,
          shared_by: user?.id,
          share_type: 'internal',
        });

      toast({
        title: "Shared!",
        description: "Post has been shared to your timeline",
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleDelete = async () => {
    if (!user?.id || post.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been successfully deleted",
      });

      onPostDeleted?.(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const getUserReaction = (reactionType: string) => {
    return post.reactions?.find(
      r => r.user_id === user?.id && r.reaction_type === reactionType
    );
  };

  const getReactionCount = (reactionType: string) => {
    return post.reactions?.filter(r => r.reaction_type === reactionType).length || 0;
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'expert': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-10 w-10 ring-2 ring-primary/10 cursor-pointer hover:ring-primary/30 transition-all"
              onClick={() => onUserClick?.(post.user_id)}
            >
              <AvatarFallback className={getRoleBadgeColor(post.profiles?.role || null)}>
                {post.profiles?.full_name?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onUserClick?.(post.user_id)}
                >
                  {post.profiles?.full_name || 'Anonymous User'}
                </span>
                {post.profiles?.role && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {post.profiles.role}
                  </Badge>
                )}
                {post.is_resolved && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                <span>•</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {post.category}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user?.id === post.user_id && (
                <>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                  <PostAnalytics postId={post.id}>
                    <DropdownMenuItem>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </DropdownMenuItem>
                  </PostAnalytics>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
              )}
              <PostReporting postId={post.id}>
                <DropdownMenuItem>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
              </PostReporting>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent 
        className="space-y-4 cursor-pointer" 
        onClick={() => onPostClick?.(post)}
      >
        <div>
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {compact ? truncateContent(post.content, 150) : post.content}
          </p>
        </div>

        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
            {post.images.slice(0, 4).map((image, index) => (
              <div 
                key={index} 
                className={`relative aspect-video bg-muted overflow-hidden ${
                  post.images!.length === 1 ? 'col-span-2' : ''
                }`}
              >
                <img 
                  src={image} 
                  alt={`Post image ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {index === 3 && post.images!.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      +{post.images!.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{post.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {viewCount}
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Trending
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 transition-colors ${
                getUserReaction('like') ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('like');
              }}
            >
              <Heart className={`h-4 w-4 ${getUserReaction('like') ? 'fill-current' : ''}`} />
              {getReactionCount('like')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 transition-colors ${
                getUserReaction('helpful') ? 'text-blue-500 hover:text-blue-600' : 'hover:text-blue-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleReaction('helpful');
              }}
            >
              <ThumbsUp className={`h-4 w-4 ${getUserReaction('helpful') ? 'fill-current' : ''}`} />
              {getReactionCount('helpful')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onPostClick?.(post);
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {post.comments_count || 0}
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-blue-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`transition-colors ${
                isBookmarked ? 'text-yellow-500 hover:text-yellow-600' : 'hover:text-yellow-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};