-- Fix the files table RLS policy to properly allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert files" ON public.files;

-- Create a policy that explicitly allows both authenticated and anonymous users
CREATE POLICY "Public can insert files" 
ON public.files 
FOR INSERT 
TO public
WITH CHECK (true);

-- Also update the SELECT policy to allow anonymous viewing
DROP POLICY IF EXISTS "View files by assignment" ON public.files;

CREATE POLICY "Public can view files" 
ON public.files 
FOR SELECT 
TO public
USING (true);