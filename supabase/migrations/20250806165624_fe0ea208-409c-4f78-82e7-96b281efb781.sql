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
CREATE INDEX IF NOT EXISTS idx_comment_threads_parent ON public.comment_threads(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_child ON public.comment_threads(child_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_attachments_post ON public.post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_templates_category ON public.post_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Add updated_at trigger to notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();