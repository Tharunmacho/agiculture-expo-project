-- Create schedules table for farm task management
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- 'planting', 'watering', 'fertilizing', 'harvesting', 'pesticide', 'other'
  crop_name TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  location TEXT,
  notes TEXT,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIMESTAMPTZ,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON public.schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON public.schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_user_status ON public.schedules(user_id, status);

-- Enable Row Level Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for schedules
CREATE POLICY "Users can view their own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON public.schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON public.schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

-- Insert some sample schedules for testing (optional)
-- These will only be inserted if there are users
INSERT INTO public.schedules (user_id, title, description, task_type, crop_name, start_date, due_date, status, priority)
SELECT 
  id,
  'Plant Rice Seedlings',
  'Prepare paddy field and plant rice seedlings in rows',
  'planting',
  'Rice',
  now(),
  now() + interval '7 days',
  'pending',
  'high'
FROM auth.users
WHERE email LIKE '%tharun%'
LIMIT 1
ON CONFLICT DO NOTHING;
