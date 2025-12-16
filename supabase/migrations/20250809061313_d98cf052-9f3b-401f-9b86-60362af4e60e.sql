-- Create a more robust fix for AI chat messages
-- First, let's ensure the service role can bypass RLS completely for AI operations

-- Drop the existing service role policy and create a more explicit one
DROP POLICY IF EXISTS "Service role can create AI messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Service role can manage messages" ON public.ai_chat_messages;

-- Create a policy that explicitly allows service role to insert AI messages
CREATE POLICY "Allow service role to insert AI messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (auth.uid() = user_id AND sender = 'user')
);

-- Also ensure service role can read messages for session management
CREATE POLICY "Allow service role to read messages"
ON public.ai_chat_messages
FOR SELECT
USING (
  (auth.role() = 'service_role') OR 
  (auth.uid() = user_id)
);

-- Ensure service role can update messages if needed
CREATE POLICY "Allow service role to update messages"
ON public.ai_chat_messages
FOR UPDATE
USING (auth.role() = 'service_role');