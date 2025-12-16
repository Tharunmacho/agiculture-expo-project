import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseRealTimeUpdatesProps {
  onPostUpdate?: () => void;
  onCommentUpdate?: () => void;
  onReactionUpdate?: () => void;
  onUserStatusUpdate?: () => void;
}

export const useRealTimeUpdates = ({
  onPostUpdate,
  onCommentUpdate,
  onReactionUpdate,
  onUserStatusUpdate
}: UseRealTimeUpdatesProps) => {
  const { user } = useAuth();

  const updateUserOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user?.id) return;
    
    try {
      await supabase.rpc('update_user_online_status', {
        p_user_id: user.id,
        p_is_online: isOnline,
        p_status_message: null
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Set user as online when component mounts
    updateUserOnlineStatus(true);

    // Listen for posts changes
    const postsChannel = supabase
      .channel('community-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          onPostUpdate?.();
        }
      )
      .subscribe();

    // Listen for comments changes
    const commentsChannel = supabase
      .channel('post-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments'
        },
        () => {
          onCommentUpdate?.();
        }
      )
      .subscribe();

    // Listen for reactions changes
    const reactionsChannel = supabase
      .channel('post-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions'
        },
        () => {
          onReactionUpdate?.();
        }
      )
      .subscribe();

    // Listen for user status changes
    const userStatusChannel = supabase
      .channel('user-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_online_status'
        },
        () => {
          onUserStatusUpdate?.();
        }
      )
      .subscribe();

    // Set user as offline when component unmounts
    const handleBeforeUnload = () => {
      updateUserOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      updateUserOnlineStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(userStatusChannel);
    };
  }, [user?.id, onPostUpdate, onCommentUpdate, onReactionUpdate, onUserStatusUpdate, updateUserOnlineStatus]);

  return {
    updateUserOnlineStatus
  };
};