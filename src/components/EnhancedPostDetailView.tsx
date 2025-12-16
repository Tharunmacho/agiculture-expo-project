import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostEditor } from './PostEditor';
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
  ChevronUp,
  Edit,
  Trash2,
  Flag,
  Share2,
  Reply,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_expert_response: boolean;
  parent_comment_id?: string;
  profiles?: {
    full_name?: string;
    role?: string;
  };
  reactions?: {
    reaction_type: string;
    user_id: string;
  }[];
  replies?: Comment[];
}

interface EnhancedPostDetailViewProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onReaction: (postId: string, reactionType: string) => void;
  getReactionCount: (post: any, reactionType: string) => number;
  hasUserReacted: (post: any, reactionType: string) => boolean;
  onSavePost?: (postId: string) => void;
  savedPosts?: string[];
  onPostUpdated?: () => void;
}

export const EnhancedPostDetailView: React.FC<EnhancedPostDetailViewProps> = ({
  post,
  isOpen,
  onClose,
  onReaction,
  getReactionCount,
  hasUserReacted,
  onSavePost,
  savedPosts = [],
  onPostUpdated
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (post?.id && isOpen) {
      loadComments();
      loadAttachments();
      setupRealtimeComments();
      trackPostView();
    }
  }, [post?.id, isOpen]);

  const trackPostView = async () => {
    if (!user || !post?.id) return;

    try {
      await supabase
        .from('post_views')
        .insert({
          post_id: post.id,
          user_id: user.id
        });
    } catch (error) {
      console.error('Error tracking post view:', error);
    }
  };

  const loadAttachments = async () => {
    if (!post?.id) return;

    try {
      const { data, error } = await supabase
        .from('post_attachments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at');

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const loadComments = async () => {
    if (!post?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id, is_expert_response, parent_comment_id, post_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
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
      
      // Build nested comment structure
      const rootComments = commentsWithProfiles.filter(c => !c.parent_comment_id);
      const nestedComments = rootComments.map(comment => ({
        ...comment,
        replies: commentsWithProfiles.filter(c => c.parent_comment_id === comment.id)
      }));
      
      setComments(nestedComments);
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
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user || !post?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentId || null,
          is_expert_response: false
        });

      if (error) throw error;

      await supabase
        .from('community_posts')
        .update({ 
          comments_count: (post.comments_count || 0) + 1 
        })
        .eq('id', post.id);

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      
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

  const handleDeletePost = async () => {
    if (!user || !post?.id || post.user_id !== user.id) return;

    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      
      onClose();
      onPostUpdated?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleReportPost = async (reportType: string, reason?: string) => {
    if (!user || !post?.id) return;

    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: post.id,
          reported_by: user.id,
          report_type: reportType,
          reason: reason
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post reported successfully",
      });
    } catch (error) {
      console.error('Error reporting post:', error);
      toast({
        title: "Error",
        description: "Failed to report post",
        variant: "destructive",
      });
    }
  };

  const handleSharePost = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Success",
        description: "Link copied to clipboard",
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

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);
  const isPostOwner = user?.id === post.user_id;
  const isSaved = savedPosts.includes(post.id);

  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <PostEditor
            editingPost={post}
            onPostCreated={() => {}}
            onEditComplete={() => {
              setIsEditing(false);
              onPostUpdated?.();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

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
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isPostOwner && (
                      <>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Post
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleDeletePost}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={handleSharePost}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Post
                    </DropdownMenuItem>
                    {!isPostOwner && (
                      <DropdownMenuItem 
                        onClick={() => handleReportPost('inappropriate')}
                        className="text-destructive"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Report Post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <h2 className="text-xl font-semibold mb-3">{post.title}</h2>
              <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
              
              {/* Post Attachments */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={attachment.file_url}
                        alt={attachment.original_filename}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(attachment.file_url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              )}
              
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
                  variant={isSaved ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSavePost?.(post.id)}
                  className="flex items-center gap-1"
                >
                  <Bookmark className="h-4 w-4" />
                  {isSaved ? 'Saved' : 'Save'}
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
                      onClick={() => handleSubmitComment()}
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
                  <div key={comment.id} className="space-y-3">
                    {/* Main Comment */}
                    <Card className="hover:shadow-sm transition-shadow">
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
                                className="h-6 px-2 text-xs"
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Like
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(comment.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <Card className="ml-8">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              className="min-h-[60px] resize-none text-sm"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handleSubmitComment(comment.id)}
                                disabled={!replyContent.trim() || isSubmitting}
                              >
                                Reply
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {comment.replies.map((reply) => (
                          <Card key={reply.id} className="border-l-4 border-primary/20">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {reply.profiles?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-xs">
                                      {reply.profiles?.full_name || 'Anonymous User'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
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