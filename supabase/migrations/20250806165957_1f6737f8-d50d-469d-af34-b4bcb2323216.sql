-- Add parent_comment_id column to post_comments for nested comments
ALTER TABLE post_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;