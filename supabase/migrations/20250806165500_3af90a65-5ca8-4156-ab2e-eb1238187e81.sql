-- Fix foreign key relationships between tables
-- Add foreign key from community_posts to profiles
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from expert_network to profiles  
ALTER TABLE expert_network 
ADD CONSTRAINT expert_network_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from post_comments to community_posts
ALTER TABLE post_comments 
ADD CONSTRAINT post_comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Add foreign key from post_reactions to community_posts
ALTER TABLE post_reactions 
ADD CONSTRAINT post_reactions_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Add foreign key from saved_posts to community_posts
ALTER TABLE saved_posts 
ADD CONSTRAINT saved_posts_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Add foreign key from community_highlights to community_posts
ALTER TABLE community_highlights 
ADD CONSTRAINT community_highlights_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Add foreign key from post_views to community_posts
ALTER TABLE post_views 
ADD CONSTRAINT post_views_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Create table for comment reactions (for nested comment threads)
CREATE TABLE public.comment_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  child_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_comment_id, child_comment_id)
);

-- Create table for post reports/moderation
CREATE TABLE public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- spam, inappropriate, misinformation, etc.
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for comment reports
CREATE TABLE public.comment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for post attachments (images, files)
CREATE TABLE public.post_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image, document, video, etc.
  file_size BIGINT,
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for post templates
CREATE TABLE public.post_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_content JSONB NOT NULL, -- stores template structure
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for notification preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  comment_notifications BOOLEAN NOT NULL DEFAULT true,
  reaction_notifications BOOLEAN NOT NULL DEFAULT true,
  follow_notifications BOOLEAN NOT NULL DEFAULT true,
  mention_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_threads
CREATE POLICY "Users can view comment threads" ON public.comment_threads
  FOR SELECT USING (true);

CREATE POLICY "Users can create comment threads" ON public.comment_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM post_comments 
      WHERE id = comment_threads.child_comment_id 
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for post_reports
CREATE POLICY "Users can create post reports" ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports" ON public.post_reports
  FOR SELECT USING (auth.uid() = reported_by);

CREATE POLICY "Admins can manage all reports" ON public.post_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'expert')
    )
  );

-- RLS Policies for comment_reports
CREATE POLICY "Users can create comment reports" ON public.comment_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own comment reports" ON public.comment_reports
  FOR SELECT USING (auth.uid() = reported_by);

CREATE POLICY "Admins can manage all comment reports" ON public.comment_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'expert')
    )
  );

-- RLS Policies for post_attachments
CREATE POLICY "Users can view post attachments" ON public.post_attachments
  FOR SELECT USING (true);

CREATE POLICY "Post authors can manage attachments" ON public.post_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_posts 
      WHERE id = post_attachments.post_id 
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for post_templates
CREATE POLICY "Users can view active templates" ON public.post_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Experts can manage templates" ON public.post_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'expert')
    )
  );

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_comment_threads_parent ON public.comment_threads(parent_comment_id);
CREATE INDEX idx_comment_threads_child ON public.comment_threads(child_comment_id);
CREATE INDEX idx_post_reports_status ON public.post_reports(status);
CREATE INDEX idx_comment_reports_status ON public.comment_reports(status);
CREATE INDEX idx_post_attachments_post ON public.post_attachments(post_id);
CREATE INDEX idx_post_templates_category ON public.post_templates(category);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Add updated_at trigger to notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();