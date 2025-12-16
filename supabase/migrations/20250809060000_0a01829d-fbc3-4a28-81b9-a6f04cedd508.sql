-- Fix the RLS policy issue and add default chat rooms if they don't exist
DO $$ 
BEGIN
  -- Insert default chat rooms if they don't exist
  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'General Discussion') THEN
    INSERT INTO public.chat_rooms (name, description, room_type, member_count, created_by)
    VALUES ('General Discussion', 'General farming discussions and community chat', 'general', 0, '00000000-0000-0000-0000-000000000000');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Rice Farming') THEN
    INSERT INTO public.chat_rooms (name, description, room_type, crop_type, member_count, created_by)
    VALUES ('Rice Farming', 'Discussions about rice cultivation, techniques, and issues', 'crop', 'rice', 0, '00000000-0000-0000-0000-000000000000');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_rooms WHERE name = 'Vegetable Growing') THEN
    INSERT INTO public.chat_rooms (name, description, room_type, crop_type, member_count, created_by)
    VALUES ('Vegetable Growing', 'Share tips about growing vegetables and garden management', 'crop', 'vegetables', 0, '00000000-0000-0000-0000-000000000000');
  END IF;
END $$;