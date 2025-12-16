-- Fix RLS policies for AI chat functionality
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage their AI chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can manage their AI chat messages" ON public.ai_chat_messages;

-- Create new policies for ai_chat_sessions
CREATE POLICY "Users can view their own sessions"
ON public.ai_chat_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
ON public.ai_chat_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.ai_chat_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions"
ON public.ai_chat_sessions
FOR ALL
USING (auth.role() = 'service_role');

-- Create new policies for ai_chat_messages
CREATE POLICY "Users can view their own messages"
ON public.ai_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can create AI messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage messages"
ON public.ai_chat_messages
FOR ALL
USING (auth.role() = 'service_role');