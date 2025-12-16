-- Create storage bucket for post attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-attachments', 'post-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for post attachments
CREATE POLICY "Anyone can view post attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-attachments');

CREATE POLICY "Users can upload post attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'post-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their post attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'post-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their post attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'post-attachments' AND auth.uid() IS NOT NULL);