-- Add user_id to enrollments table
ALTER TABLE public.enrollments 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to assignments (for direct access control)
ALTER TABLE public.assignments 
ADD COLUMN user_id UUID;

-- Update existing enrollments to link to a system user (if any exist)
-- Note: In production, you'd need to handle existing data differently

-- Drop existing public RLS policies
DROP POLICY IF EXISTS "Public can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Public can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Public can update own enrollments" ON public.enrollments;

DROP POLICY IF EXISTS "Public can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Public can insert assignments" ON public.assignments;
DROP POLICY IF EXISTS "Public can update assignments" ON public.assignments;

DROP POLICY IF EXISTS "Public can view payment info" ON public.payment_info;
DROP POLICY IF EXISTS "Public can insert payment info" ON public.payment_info;

DROP POLICY IF EXISTS "Public can insert files" ON public.files;
DROP POLICY IF EXISTS "Public can view files" ON public.files;

-- Create secure RLS policies for enrollments
CREATE POLICY "Users can view own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" 
ON public.enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for assignments
CREATE POLICY "Users can view own assignments" 
ON public.assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignments" 
ON public.assignments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assignments" 
ON public.assignments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for payment_info
CREATE POLICY "Users can view own payment info" 
ON public.payment_info 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.enrollments WHERE id = enrollment_id
  )
);

CREATE POLICY "Users can insert own payment info" 
ON public.payment_info 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.enrollments WHERE id = enrollment_id
  )
);

-- Create secure RLS policies for files
CREATE POLICY "Users can view own files" 
ON public.files 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.assignments WHERE proof_file_id = files.id
  )
);

CREATE POLICY "Users can insert own files" 
ON public.files 
FOR INSERT 
WITH CHECK (true);  -- Will be restricted by assignments table

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON public.assignments(user_id);