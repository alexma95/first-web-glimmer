-- Create storage policies for the proofs bucket to allow public uploads

-- Allow anyone to upload their proof files
CREATE POLICY "Anyone can upload proof files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'proofs');

-- Allow anyone to view proof files (needed for admin review)
CREATE POLICY "Anyone can view proof files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'proofs');

-- Allow anyone to update their proof files (for re-uploads)
CREATE POLICY "Anyone can update proof files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'proofs');

-- Allow deletion if needed (for corrections)
CREATE POLICY "Anyone can delete proof files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'proofs');