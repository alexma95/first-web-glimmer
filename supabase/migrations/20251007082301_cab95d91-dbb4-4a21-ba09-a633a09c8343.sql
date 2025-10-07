-- Create storage bucket for assignment uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-uploads',
  'assignment-uploads',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for assignment uploads
CREATE POLICY "Anyone can upload assignment images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'assignment-uploads');

CREATE POLICY "Anyone can view assignment images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assignment-uploads');

CREATE POLICY "Anyone can update their uploads"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'assignment-uploads');

-- Add upload_url column to assignment_texts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignment_texts' 
    AND column_name = 'upload_url'
  ) THEN
    ALTER TABLE public.assignment_texts
    ADD COLUMN upload_url text;
  END IF;
END $$;

COMMENT ON COLUMN public.assignment_texts.upload_url IS 'Storage path for uploaded image';