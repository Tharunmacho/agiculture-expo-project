-- Create comprehensive social media and chat features (fixed)

-- Enhanced chat rooms with crop/region specificity
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'crop', 'region', 'private'
  crop_type TEXT,
  region TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  max_members INTEGER DEFAULT 100,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User activity feed for social engagement
CREATE TABLE IF NOT EXISTS public.user_activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'like', 'comment', 'share', 'follow', 'post_created'
  target_type TEXT NOT NULL, -- 'post', 'comment', 'user'
  target_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification queue for real-time alerts
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'message', 'reaction', 'mention', 'follow', 'comment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced post features (polls, videos, location)
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS poll_data JSONB,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS location_data JSONB,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS image_carousel JSONB,
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'standard'; -- 'standard', 'poll', 'video', 'carousel'

-- User achievements and gamification
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL, -- 'first_post', 'helpful_member', 'expert_contributor'
  achievement_name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  points_awarded INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community challenges and contests
CREATE TABLE IF NOT EXISTS public.community_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL, -- 'photo', 'knowledge', 'harvest', 'innovation'
  rules JSONB,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  prize_description TEXT,
  created_by UUID NOT NULL,
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge participation
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL,
  user_id UUID NOT NULL,
  submission_data JSONB,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score INTEGER,
  rank INTEGER,
  UNIQUE(challenge_id, user_id)
);

-- Community leaderboards
CREATE TABLE IF NOT EXISTS public.community_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'overall', 'monthly', 'crop_expert', 'helpful_member'
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start DATE,
  period_end DATE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, period_start)
);

-- Live streaming sessions
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT,
  stream_key TEXT,
  host_id UUID NOT NULL,
  max_viewers INTEGER DEFAULT 100,
  current_viewers INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  is_live BOOLEAN DEFAULT false,
  category TEXT, -- 'farming_demo', 'qa_session', 'workshop'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live stream viewers
CREATE TABLE IF NOT EXISTS public.stream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(stream_id, user_id)
);

-- Comment attachments
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'document'
  file_size BIGINT,
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms (corrected)
CREATE POLICY "Users can view public chat rooms" ON public.chat_rooms
  FOR SELECT USING (is_private = false OR auth.uid() = created_by);

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON public.chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for user_activity_feed
CREATE POLICY "Users can view activity feed" ON public.user_activity_feed
  FOR SELECT USING (true);

CREATE POLICY "System can create activity feed" ON public.user_activity_feed
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_queue
CREATE POLICY "Users can view their notifications" ON public.notification_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notification_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notification_queue
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view all achievements" ON public.user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can create achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (true);

-- RLS Policies for community_challenges
CREATE POLICY "Users can view active challenges" ON public.community_challenges
  FOR SELECT USING (is_active = true OR auth.uid() = created_by);

CREATE POLICY "Users can create challenges" ON public.community_challenges
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Challenge creators can update challenges" ON public.community_challenges
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for challenge_participants
CREATE POLICY "Users can view challenge participation" ON public.challenge_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can participate in challenges" ON public.challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.challenge_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for community_leaderboard
CREATE POLICY "Users can view leaderboard" ON public.community_leaderboard
  FOR SELECT USING (true);

-- RLS Policies for live_streams
CREATE POLICY "Users can view live streams" ON public.live_streams
  FOR SELECT USING (true);

CREATE POLICY "Users can create live streams" ON public.live_streams
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Stream hosts can update streams" ON public.live_streams
  FOR UPDATE USING (auth.uid() = host_id);

-- RLS Policies for stream_viewers
CREATE POLICY "Users can view stream viewers" ON public.stream_viewers
  FOR SELECT USING (true);

CREATE POLICY "Users can join streams" ON public.stream_viewers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their stream status" ON public.stream_viewers
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for comment_attachments
CREATE POLICY "Users can view comment attachments" ON public.comment_attachments
  FOR SELECT USING (true);

CREATE POLICY "Comment authors can manage attachments" ON public.comment_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.post_comments 
      WHERE post_comments.id = comment_attachments.comment_id 
      AND post_comments.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type_region ON public.chat_rooms(room_type, region, crop_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_feed_user_created ON public.user_activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_unread ON public.notification_queue(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_challenges_active ON public.community_challenges(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_live_streams_active ON public.live_streams(is_live, started_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_viewers;

-- Create replica identity for realtime
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.notification_queue REPLICA IDENTITY FULL;
ALTER TABLE public.user_activity_feed REPLICA IDENTITY FULL;
ALTER TABLE public.live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.stream_viewers REPLICA IDENTITY FULL;