-- Drop existing foreign key if it exists and recreate with proper naming
DO $$
BEGIN
  -- Try to drop existing constraint if it exists
  ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if constraint doesn't exist
END $$;

-- Add foreign key from post_comments to community_posts
ALTER TABLE post_comments 
ADD CONSTRAINT post_comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- Create table for comment reactions (for nested comment threads)
CREATE TABLE IF NOT EXISTS public.comment_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  child_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_comment_id, child_comment_id)
);

-- Create table for post reports/moderation
CREATE TABLE IF NOT EXISTS public.post_reports (
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
CREATE TABLE IF NOT EXISTS public.comment_reports (
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
CREATE TABLE IF NOT EXISTS public.post_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image, document, video, etc.
  file_size BIGINT,
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for post templates
CREATE TABLE IF NOT EXISTS public.post_templates (
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
CREATE TABLE IF NOT EXISTS public.notification_preferences (
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

-- Insert default post templates
INSERT INTO public.post_templates (name, description, template_content, category, created_by) VALUES
('Disease Identification', 'Template for reporting plant diseases', 
 '{"title": "Plant Disease Help Needed", "fields": [{"name": "crop_type", "label": "Crop Type", "type": "text", "required": true}, {"name": "symptoms", "label": "Symptoms Observed", "type": "textarea", "required": true}, {"name": "location", "label": "Location/Region", "type": "text", "required": false}, {"name": "duration", "label": "How long have you noticed this?", "type": "text", "required": false}]}', 
 'plant_health', NULL),
('Crop Advisory', 'Template for seeking crop management advice', 
 '{"title": "Crop Management Question", "fields": [{"name": "crop_type", "label": "Crop Type", "type": "text", "required": true}, {"name": "growth_stage", "label": "Growth Stage", "type": "select", "options": ["Seedling", "Vegetative", "Flowering", "Fruit Development", "Maturity"], "required": true}, {"name": "issue", "label": "Issue/Question", "type": "textarea", "required": true}, {"name": "current_practices", "label": "Current Practices", "type": "textarea", "required": false}]}', 
 'crop_management', NULL),
('Market Price Inquiry', 'Template for market price questions', 
 '{"title": "Market Price Information", "fields": [{"name": "commodity", "label": "Commodity", "type": "text", "required": true}, {"name": "location", "label": "Market Location", "type": "text", "required": true}, {"name": "quantity", "label": "Quantity", "type": "text", "required": false}, {"name": "quality_grade", "label": "Quality/Grade", "type": "text", "required": false}]}', 
 'market', NULL)
ON CONFLICT DO NOTHING;