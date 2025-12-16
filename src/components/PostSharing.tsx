import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle,
  Send,
  ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  };
}

interface PostSharingProps {
  post: Post;
  trigger?: React.ReactNode;
}

export const PostSharing: React.FC<PostSharingProps> = ({ post, trigger }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [shareType, setShareType] = useState<'internal' | 'external'>('internal');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const postUrl = `${window.location.origin}/community?post=${post.id}`;
  const shareText = `Check out this interesting post: "${post.title}" by ${post.profiles?.full_name || 'a community member'}`;

  const recordShare = async (platform: string) => {
    if (!user) return;

    try {
      await supabase
        .from('post_shares')
        .insert({
          post_id: post.id,
          shared_by: user.id,
          share_type: shareType,
          platform: platform
        });

      // Record activity
      await supabase
        .from('user_activity_feed')
        .insert({
          user_id: user.id,
          activity_type: 'share',
          target_type: 'post',
          target_id: post.id,
          metadata: { platform, share_type: shareType }
        });
    } catch (error) {
      console.error('Error recording share:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      await recordShare('clipboard');
      toast({
        title: "Link copied!",
        description: "Post link has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const shareToSocialMedia = async (platform: string) => {
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      await recordShare(platform);
      toast({
        title: "Shared!",
        description: `Post shared to ${platform}`,
      });
    }
  };

  const sendDirectMessage = async () => {
    if (!shareMessage.trim() || selectedUsers.length === 0) return;

    try {
      // Send direct messages to selected users
      const messagePromises = selectedUsers.map(userId =>
        supabase
          .from('direct_messages')
          .insert({
            sender_id: user?.id,
            recipient_id: userId,
            message: `${shareMessage}\n\nShared post: ${postUrl}`,
            message_type: 'text'
          })
      );

      await Promise.all(messagePromises);
      await recordShare('direct_message');

      setShareMessage('');
      setSelectedUsers([]);
      setIsOpen(false);
      
      toast({
        title: "Sent!",
        description: `Post shared with ${selectedUsers.length} user(s)`,
      });
    } catch (error) {
      console.error('Error sending direct messages:', error);
      toast({
        title: "Error",
        description: "Failed to send messages",
        variant: "destructive",
      });
    }
  };

  // Load users when dialog opens
  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .neq('user_id', user?.id)
        .limit(50);
      
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" onClick={loadUsers}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
          <DialogDescription>
            Share "{post.title}" with others
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={shareType === 'internal' ? 'default' : 'outline'}
              onClick={() => setShareType('internal')}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Internal
            </Button>
            <Button
              variant={shareType === 'external' ? 'default' : 'outline'}
              onClick={() => setShareType('external')}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              External
            </Button>
          </div>

          {shareType === 'internal' ? (
            /* Internal Sharing */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Add a message (optional)"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  className="h-20"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Send to users</label>
                <Select onValueChange={(userId) => {
                  if (!selectedUsers.includes(userId)) {
                    setSelectedUsers([...selectedUsers, userId]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select users..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || 'Anonymous'} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUsers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Selected {selectedUsers.length} user(s)
                </div>
              )}

              <Button
                onClick={sendDirectMessage}
                disabled={selectedUsers.length === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          ) : (
            /* External Sharing */
            <div className="space-y-4">
              {/* Copy Link */}
              <div className="flex gap-2">
                <Input value={postUrl} readOnly className="flex-1" />
                <Button onClick={copyToClipboard} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Social Media Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => shareToSocialMedia('facebook')}
                  className="flex items-center gap-2"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => shareToSocialMedia('twitter')}
                  className="flex items-center gap-2"
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => shareToSocialMedia('linkedin')}
                  className="flex items-center gap-2"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => shareToSocialMedia('whatsapp')}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};