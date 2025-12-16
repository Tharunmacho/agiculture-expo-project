-- Enhanced Community Features Migration
-- Phase 1: Real-time Chat, Enhanced Comments, and Social Features

-- Chat Rooms for community discussions
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'public',
  crop_type TEXT,
  region TEXT,
  created_by UUID NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat Messages for real-time messaging
CREATE TABLE public.chat_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  reply_to_id UUID REFERENCES public.chat_room_messages(id),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat Room Members
CREATE TABLE public.chat_room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enhanced Comment Reactions (emoji reactions)
CREATE TABLE public.comment_emoji_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- User Stories (like Instagram stories)
CREATE TABLE public.user_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  text_content TEXT,
  image_url TEXT,
  background_color TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Story Views tracking
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Post Shares for social sharing
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  share_type TEXT NOT NULL DEFAULT 'internal',
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Activity Feed for social timeline
CREATE TABLE public.user_activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trending Topics/Hashtags
CREATE TABLE public.trending_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL UNIQUE,
  mention_count INTEGER NOT NULL DEFAULT 1,
  trend_score DECIMAL NOT NULL DEFAULT 0,
  last_mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Mentions in posts and comments
CREATE TABLE public.user_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentioned_user_id UUID NOT NULL,
  mentioning_user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Online Status tracking
CREATE TABLE public.user_online_status (
  user_id UUID NOT NULL PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_emoji_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_online_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Chat Rooms
CREATE POLICY "Users can view public chat rooms" ON public.chat_rooms
  FOR SELECT USING (room_type = 'public' OR EXISTS (
    SELECT 1 FROM public.chat_room_members 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update rooms" ON public.chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for Chat Messages
CREATE POLICY "Users can view messages in their rooms" ON public.chat_room_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_room_members 
    WHERE room_id = chat_room_messages.room_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages to their rooms" ON public.chat_room_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_room_members 
    WHERE room_id = chat_room_messages.room_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can edit their own messages" ON public.chat_room_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Chat Room Members
CREATE POLICY "Users can view room memberships" ON public.chat_room_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join/leave rooms" ON public.chat_room_members
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for Comment Emoji Reactions
CREATE POLICY "Users can view comment reactions" ON public.comment_emoji_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their reactions" ON public.comment_emoji_reactions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for User Stories
CREATE POLICY "Users can view active stories" ON public.user_stories
  FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can create their stories" ON public.user_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their stories" ON public.user_stories
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Story Views
CREATE POLICY "Story owners can view story views" ON public.story_views
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_stories 
    WHERE id = story_views.story_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create story views" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for Post Shares
CREATE POLICY "Users can view post shares" ON public.post_shares
  FOR SELECT USING (true);

CREATE POLICY "Users can share posts" ON public.post_shares
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- RLS Policies for Activity Feed
CREATE POLICY "Users can view activity feed" ON public.user_activity_feed
  FOR SELECT USING (true);

CREATE POLICY "System can create activity feed" ON public.user_activity_feed
  FOR INSERT WITH CHECK (true);

-- RLS Policies for Trending Topics
CREATE POLICY "Users can view trending topics" ON public.trending_topics
  FOR SELECT USING (true);

CREATE POLICY "System can manage trending topics" ON public.trending_topics
  FOR ALL USING (true);

-- RLS Policies for User Mentions
CREATE POLICY "Users can view mentions" ON public.user_mentions
  FOR SELECT USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioning_user_id);

CREATE POLICY "Users can create mentions" ON public.user_mentions
  FOR INSERT WITH CHECK (auth.uid() = mentioning_user_id);

-- RLS Policies for Online Status
CREATE POLICY "Users can view online status" ON public.user_online_status
  FOR SELECT USING (true);

CREATE POLICY "Users can update their status" ON public.user_online_status
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_chat_room_messages_room_id ON public.chat_room_messages(room_id);
CREATE INDEX idx_chat_room_messages_created_at ON public.chat_room_messages(created_at DESC);
CREATE INDEX idx_chat_room_members_user_id ON public.chat_room_members(user_id);
CREATE INDEX idx_comment_emoji_reactions_comment_id ON public.comment_emoji_reactions(comment_id);
CREATE INDEX idx_user_stories_expires_at ON public.user_stories(expires_at);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_user_activity_feed_user_id ON public.user_activity_feed(user_id);
CREATE INDEX idx_user_activity_feed_created_at ON public.user_activity_feed(created_at DESC);
CREATE INDEX idx_trending_topics_trend_score ON public.trending_topics(trend_score DESC);
CREATE INDEX idx_user_mentions_mentioned_user ON public.user_mentions(mentioned_user_id);

-- Create triggers for real-time functionality
CREATE OR REPLACE FUNCTION public.update_chat_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_room_updated_at();

CREATE TRIGGER update_chat_room_messages_updated_at
  BEFORE UPDATE ON public.chat_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_room_updated_at();

-- Function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_online_status(p_user_id UUID, p_is_online BOOLEAN, p_status_message TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_online_status (user_id, is_online, status_message, last_seen, updated_at)
  VALUES (p_user_id, p_is_online, p_status_message, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_online = p_is_online,
    status_message = COALESCE(p_status_message, user_online_status.status_message),
    last_seen = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default chat rooms
INSERT INTO public.chat_rooms (name, description, room_type, created_by) VALUES
  ('General Discussion', 'General farming discussions and community chat', 'public', '00000000-0000-0000-0000-000000000000'),
  ('Crop Questions', 'Ask questions about crops and get expert advice', 'public', '00000000-0000-0000-0000-000000000000'),
  ('Market Talk', 'Discuss market prices and trading', 'public', '00000000-0000-0000-0000-000000000000'),
  ('Organic Farming', 'Focused on organic and sustainable farming practices', 'public', '00000000-0000-0000-0000-000000000000');

-- Enable realtime for new tables
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_room_members REPLICA IDENTITY FULL;
ALTER TABLE public.user_stories REPLICA IDENTITY FULL;
ALTER TABLE public.user_online_status REPLICA IDENTITY FULL;