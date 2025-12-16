-- Enable users to delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON community_posts 
FOR DELETE 
USING (auth.uid() = user_id);