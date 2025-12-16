import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Send, 
  MoreVertical,
  Clock,
  User,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_expert_response: boolean;
  profiles?: {
    full_name?: string;
    role?: string;
  };
  reactions?: {
    reaction_type: string;
    user_id: string;
  }[];
}

interface PostDetailViewProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onReaction: (postId: string, reactionType: string) => void;
  getReactionCount: (post: any, reactionType: string) => number;
  hasUserReacted: (post: any, reactionType: string) => boolean;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({
  post,
  isOpen,
  onClose,
  onReaction,
  getReactionCount,
  hasUserReacted
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Load comments when post changes
  useEffect(() => {
    if (post?.id && isOpen) {
      loadComments();
      setupRealtimeComments();
    }
  }, [post?.id, isOpen]);

  const loadComments = async () => {
    if (!post?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch profiles separately to avoid relationship issues
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', comment.user_id)
            .single();
          
          return {
            ...comment,
            profiles: profile || { full_name: null, role: null }
          };
        })
      );
      
      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeComments = () => {
    if (!post?.id) return;

    const channel = supabase
      .channel(`post_comments_${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          // Fetch the comment data
          const { data: comment } = await supabase
            .from('post_comments')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (comment) {
            // Fetch profile separately
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('user_id', comment.user_id)
              .single();

            const commentWithProfile = {
              ...comment,
              profiles: profile || { full_name: null, role: null }
            };

            setComments(prev => [...prev, commentWithProfile]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !post?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim(),
          is_expert_response: false // We can enhance this later with expert detection
        });

      if (error) throw error;

      // Update comments count
      await supabase
        .from('community_posts')
        .update({ 
          comments_count: (post.comments_count || 0) + 1 
        })
        .eq('id', post.id);

      setNewComment('');
      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentReaction = async (commentId: string, reactionType: string) => {
    if (!user) return;

    try {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .single();

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType
          });
      }
    } catch (error) {
      console.error('Error handling comment reaction:', error);
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

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Post Details</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Post Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Anonymous User</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(post.created_at)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {post.category}
                  </Badge>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-3">{post.title}</h2>
              <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
              
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <Button
                  variant={hasUserReacted(post, 'like') ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onReaction(post.id, 'like')}
                  className="flex items-center gap-1"
                >
                  <Heart className="h-4 w-4" />
                  {getReactionCount(post, 'like')}
                </Button>
                <Button
                  variant={hasUserReacted(post, 'helpful') ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onReaction(post.id, 'helpful')}
                  className="flex items-center gap-1"
                >
                  <Star className="h-4 w-4" />
                  {getReactionCount(post, 'helpful')}
                </Button>
                <Button
                  variant={hasUserReacted(post, 'bookmark') ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onReaction(post.id, 'bookmark')}
                  className="flex items-center gap-1"
                >
                  <Bookmark className="h-4 w-4" />
                  {getReactionCount(post, 'bookmark')}
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                  <MessageSquare className="h-4 w-4" />
                  <span>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Comments</h3>
            
            {/* Comment Input */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Share your thoughts or advice..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments List */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading comments...
              </div>
            ) : displayedComments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayedComments.map((comment) => (
                  <Card key={comment.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {comment.profiles?.full_name || 'Anonymous User'}
                            </span>
                            {comment.is_expert_response && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Expert
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentReaction(comment.id, 'like')}
                              className="h-6 px-2 text-xs"
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              Like
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentReaction(comment.id, 'helpful')}
                              className="h-6 px-2 text-xs"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Helpful
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {comments.length > 3 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="w-full"
                  >
                    {showAllComments ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less Comments
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {comments.length} Comments
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};