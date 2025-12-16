-- First, let's check if ai_chat_sessions table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_title TEXT DEFAULT 'Untitled Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_chat_sessions
CREATE POLICY "Users can manage their own AI chat sessions" 
ON public.ai_chat_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Update RLS policy for ai_chat_messages to allow system access
DROP POLICY IF EXISTS "Users can manage their AI chat messages" ON public.ai_chat_messages;

CREATE POLICY "Users can manage their AI chat messages" 
ON public.ai_chat_messages 
FOR ALL 
USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Check if chat_rooms table exists, if not create it
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'general',
  crop_type TEXT,
  region TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_rooms
CREATE POLICY "Users can view active chat rooms" 
ON public.chat_rooms 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create chat rooms" 
ON public.chat_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Insert some default chat rooms if they don't exist
INSERT INTO public.chat_rooms (name, description, room_type, created_by)
SELECT 'General Discussion', 'General farming discussions and community chat', 'general', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'General Discussion');

INSERT INTO public.chat_rooms (name, description, room_type, crop_type, created_by)
SELECT 'Rice Farming', 'Discussions about rice cultivation, techniques, and issues', 'crop', 'rice', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Rice Farming');

INSERT INTO public.chat_rooms (name, description, room_type, crop_type, created_by)
SELECT 'Vegetable Growing', 'Share tips about growing vegetables and garden management', 'crop', 'vegetables', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Vegetable Growing');

-- Update trigger for chat sessions
CREATE OR REPLACE FUNCTION public.update_ai_chat_session_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger for ai_chat_sessions
DROP TRIGGER IF EXISTS update_ai_chat_sessions_updated_at ON public.ai_chat_sessions;
CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_chat_session_updated_at();