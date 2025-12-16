-- Create user follows table for following system
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create saved posts table
CREATE TABLE public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create post views table for trending algorithm
CREATE TABLE public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  session_id TEXT
);

-- Create community highlights table
CREATE TABLE public.community_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  highlighted_by UUID NOT NULL REFERENCES auth.users(id),
  highlight_type TEXT NOT NULL DEFAULT 'featured', -- featured, announcement, expert_answer
  priority INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_highlights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "Users can manage their follows" ON public.user_follows
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Users can view all follows" ON public.user_follows
  FOR SELECT USING (true);

-- RLS Policies for saved_posts
CREATE POLICY "Users can manage their saved posts" ON public.saved_posts
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for post_views
CREATE POLICY "Users can create post views" ON public.post_views
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can view post views for analytics" ON public.post_views
  FOR SELECT USING (true);

-- RLS Policies for community_highlights
CREATE POLICY "Anyone can view highlights" ON public.community_highlights
  FOR SELECT USING (true);

CREATE POLICY "Experts can create highlights" ON public.community_highlights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('expert', 'admin')
    )
  );

CREATE POLICY "Experts can update their highlights" ON public.community_highlights
  FOR UPDATE USING (auth.uid() = highlighted_by);

-- Add indexes for performance
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_saved_posts_user ON public.saved_posts(user_id);
CREATE INDEX idx_saved_posts_post ON public.saved_posts(post_id);
CREATE INDEX idx_post_views_post ON public.post_views(post_id);
CREATE INDEX idx_post_views_viewed_at ON public.post_views(viewed_at);
CREATE INDEX idx_community_highlights_priority ON public.community_highlights(priority DESC);
CREATE INDEX idx_community_highlights_expires ON public.community_highlights(expires_at);

-- Create function to get trending posts
CREATE OR REPLACE FUNCTION public.get_trending_posts(
  time_window INTERVAL DEFAULT '7 days',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  post_id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  view_count BIGINT,
  reaction_count BIGINT,
  comment_count INTEGER,
  trending_score NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as post_id,
    cp.title,
    cp.content,
    cp.category,
    cp.user_id,
    cp.created_at,
    COALESCE(view_stats.view_count, 0) as view_count,
    COALESCE(reaction_stats.reaction_count, 0) as reaction_count,
    COALESCE(cp.comments_count, 0) as comment_count,
    -- Trending score: weighted combination of views, reactions, comments with time decay
    (
      COALESCE(view_stats.view_count, 0) * 1.0 +
      COALESCE(reaction_stats.reaction_count, 0) * 3.0 +
      COALESCE(cp.comments_count, 0) * 5.0
    ) * EXP(-EXTRACT(EPOCH FROM (NOW() - cp.created_at)) / 86400.0) as trending_score
  FROM community_posts cp
  LEFT JOIN (
    SELECT 
      pv.post_id, 
      COUNT(*) as view_count
    FROM post_views pv
    WHERE pv.viewed_at >= NOW() - time_window
    GROUP BY pv.post_id
  ) view_stats ON cp.id = view_stats.post_id
  LEFT JOIN (
    SELECT 
      pr.post_id, 
      COUNT(*) as reaction_count
    FROM post_reactions pr
    WHERE pr.created_at >= NOW() - time_window
    GROUP BY pr.post_id
  ) reaction_stats ON cp.id = reaction_stats.post_id
  WHERE cp.created_at >= NOW() - time_window
  ORDER BY trending_score DESC
  LIMIT limit_count;
END;
$$;

-- Add updated_at trigger to community_highlights
CREATE TRIGGER update_community_highlights_updated_at
  BEFORE UPDATE ON public.community_highlights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();