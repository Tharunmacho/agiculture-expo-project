import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Smile, 
  Image, 
  Reply, 
  MoreVertical, 
  Edit3, 
  Trash2,
  AtSign,
  Heart,
  ThumbsUp,
  Laugh,
  Brain,
  Eye,
  Star
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  is_expert_response: boolean;
  is_edited?: boolean;
  profiles?: {
    full_name?: string;
    role?: string;
  };
  reactions?: {
    id: string;
    reaction_type: string;
    user_id: string;
  }[];
  attachments?: {
    id: string;
    file_url: string;
    file_type: string;
    original_filename: string;
  }[];
  replies?: Comment[];
}

interface User {
  user_id: string;
  full_name: string;
  role: string;
}

interface EnhancedCommentingSystemProps {
  postId: string;
  onCommentsUpdate?: (count: number) => void;
}

const EMOJI_REACTIONS = [
  { emoji: '👍', type: 'thumbs_up', label: 'Thumbs Up' },
  { emoji: '❤️', type: 'heart', label: 'Heart' },
  { emoji: '😂', type: 'laugh', label: 'Laugh' },
  { emoji: '🤔', type: 'thinking', label: 'Thinking' },
  { emoji: '😮', type: 'wow', label: 'Wow' },
  { emoji: '⭐', type: 'star', label: 'Star' }
];

export const EnhancedCommentingSystem: React.FC<EnhancedCommentingSystemProps> = ({
  postId,
  onCommentsUpdate
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (postId) {
      loadComments();
      setupRealtimeComments();
    }
  }, [postId]);

  const loadComments = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      // Load comments with reactions
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          comment_reactions (
            id,
            reaction_type,
            user_id
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Load profiles separately
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', userIds);

      // Combine data
      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        updated_at: comment.created_at, // Use created_at as fallback
        profiles: profiles?.find(p => p.user_id === comment.user_id) || null,
        reactions: comment.comment_reactions || [],
        attachments: [] // Will load separately if needed
      })) || [];

      // Organize comments with replies
      const topLevelComments = commentsWithProfiles.filter(c => !c.parent_comment_id);
      const organizedComments = topLevelComments.map(comment => ({
        ...comment,
        replies: commentsWithProfiles.filter(c => c.parent_comment_id === comment.id)
      }));

      setComments(organizedComments);
      onCommentsUpdate?.(commentsWithProfiles.length);
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
    const channel = supabase
      .channel(`post_comments_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          loadComments(); // Reload on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
          parent_comment_id: replyToComment,
          is_expert_response: false // Can be enhanced based on user role
        });

      if (error) throw error;

      setNewComment('');
      setReplyToComment(null);
      setShowMentions(false);
      
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
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ 
          content: editingContent.trim(),
          is_edited: true
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditingContent('');
      
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (commentId: string, reactionType: string) => {
    if (!user) return;

    try {
      const comment = comments.find(c => c.id === commentId);
      const existingReaction = comment?.reactions?.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

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
      console.error('Error handling reaction:', error);
    }
  };

  const handleFileUpload = async (file: File, commentId?: string) => {
    if (!user) return;

    try {
      setUploading(true);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-attachments')
        .getPublicUrl(fileName);

      // Save attachment record (using post_attachments table for now)
      const { error: attachmentError } = await supabase
        .from('post_attachments')
        .insert({
          post_id: commentId, // Using comment ID temporarily
          file_url: urlData.publicUrl,
          file_type: file.type,
          original_filename: file.name,
          file_size: file.size
        });

      if (attachmentError) throw attachmentError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setMentionSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setMentionSuggestions(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setNewComment(value);
    
    // Check for mentions
    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1);
      setMentionQuery(query);
      setShowMentions(true);
      searchUsers(query);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    const words = newComment.split(' ');
    words[words.length - 1] = `@${user.full_name}`;
    setNewComment(words.join(' ') + ' ');
    setShowMentions(false);
    textareaRef.current?.focus();
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

  const getReactionCount = (comment: Comment, reactionType: string) => {
    return comment.reactions?.filter(r => r.reaction_type === reactionType).length || 0;
  };

  const hasUserReacted = (comment: Comment, reactionType: string) => {
    return comment.reactions?.some(r => r.user_id === user?.id && r.reaction_type === reactionType) || false;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <Card key={comment.id} className={`${isReply ? 'ml-8 mt-3' : ''} hover:shadow-sm transition-shadow`}>
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
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditingContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Comment attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="relative">
                        {attachment.file_type.startsWith('image/') ? (
                          <img
                            src={attachment.file_url}
                            alt={attachment.original_filename}
                            className="max-w-xs rounded-lg border"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 border rounded bg-muted">
                            <Image className="h-4 w-4" />
                            <span className="text-sm">{attachment.original_filename}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reaction buttons */}
                <div className="flex items-center gap-2 mb-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <Smile className="h-3 w-3 mr-1" />
                        React
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="flex gap-1">
                        {EMOJI_REACTIONS.map((reaction) => (
                          <Button
                            key={reaction.type}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleReaction(comment.id, reaction.type)}
                            title={reaction.label}
                          >
                            {reaction.emoji}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setReplyToComment(comment.id)}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>

                  {comment.user_id === user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditingContent(comment.content);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Reaction display */}
                <div className="flex flex-wrap gap-1">
                  {EMOJI_REACTIONS.map((reaction) => {
                    const count = getReactionCount(comment, reaction.type);
                    const hasReacted = hasUserReacted(comment, reaction.type);
                    
                    if (count === 0) return null;
                    
                    return (
                      <Button
                        key={reaction.type}
                        variant={hasReacted ? "default" : "secondary"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleReaction(comment.id, reaction.type)}
                      >
                        {reaction.emoji} {count}
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      
      {/* Comment Input */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Share your thoughts or advice... (Use @ to mention users)"
                value={newComment}
                onChange={(e) => handleInputChange(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              
              {/* Mention suggestions */}
              {showMentions && mentionSuggestions.length > 0 && (
                <Card className="absolute z-10 mt-1 w-full">
                  <CardContent className="p-2">
                    {mentionSuggestions.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => insertMention(user)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {replyToComment && (
              <div className="bg-muted p-2 rounded text-sm">
                Replying to comment...
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 px-2"
                  onClick={() => setReplyToComment(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Image className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Attach Image'}
                </Button>
              </div>
              
              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || loading}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Post Comment
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
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <AtSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {renderComment(comment)}
              {comment.replies?.map((reply) => renderComment(reply, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};