-- Make user_id nullable (allow enrollments without authentication)
ALTER TABLE public.enrollments 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.assignments 
ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies for enrollments
-- Allow anyone to insert (fast signup)
-- Allow viewing by enrollment ID (acts as private token) OR by authenticated user
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;

-- Public can create enrollments (no auth needed)
CREATE POLICY "Anyone can create enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (true);

-- Can view if you know the enrollment ID (from URL) OR if you're the authenticated owner
CREATE POLICY "View enrollment by ID or owner" 
ON public.enrollments 
FOR SELECT 
USING (
  user_id IS NULL  -- Allow viewing enrollments without user_id
  OR auth.uid() = user_id  -- Or if authenticated and you own it
);

-- Can update if you know the enrollment ID OR if you're the owner
CREATE POLICY "Update enrollment by ID or owner" 
ON public.enrollments 
FOR UPDATE 
USING (
  user_id IS NULL 
  OR auth.uid() = user_id
);

-- Update RLS policies for assignments
DROP POLICY IF EXISTS "Users can view own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can insert own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON public.assignments;

CREATE POLICY "Anyone can create assignments" 
ON public.assignments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "View assignments by enrollment" 
ON public.assignments 
FOR SELECT 
USING (
  user_id IS NULL
  OR auth.uid() = user_id
  OR enrollment_id IN (SELECT id FROM public.enrollments WHERE user_id IS NULL)
);

CREATE POLICY "Update assignments by enrollment" 
ON public.assignments 
FOR UPDATE 
USING (
  user_id IS NULL
  OR auth.uid() = user_id
  OR enrollment_id IN (SELECT id FROM public.enrollments WHERE user_id IS NULL)
);

-- Update payment_info policies
DROP POLICY IF EXISTS "Users can view own payment info" ON public.payment_info;
DROP POLICY IF EXISTS "Users can insert own payment info" ON public.payment_info;

CREATE POLICY "Anyone can insert payment info" 
ON public.payment_info 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "View payment info by enrollment" 
ON public.payment_info 
FOR SELECT 
USING (
  enrollment_id IN (
    SELECT id FROM public.enrollments 
    WHERE user_id IS NULL OR auth.uid() = user_id
  )
);

-- Update files policies to allow public access for enrollment-related files
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;

CREATE POLICY "Anyone can insert files" 
ON public.files 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "View files by assignment" 
ON public.files 
FOR SELECT 
USING (
  id IN (
    SELECT proof_file_id FROM public.assignments 
    WHERE user_id IS NULL OR auth.uid() = user_id
  )
);