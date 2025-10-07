-- Ensure RLS is enabled on all tables with sensitive data
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Verify no anonymous access by dropping any remaining public policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.enrollments;
DROP POLICY IF EXISTS "Public read access" ON public.enrollments;

-- Ensure campaigns_new has limited public access (only active campaigns, no emails visible in client)
DROP POLICY IF EXISTS "Public can view campaigns" ON public.campaigns_new;
DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns_new;

CREATE POLICY "Public can view active campaigns limited" 
ON public.campaigns_new 
FOR SELECT 
USING (status = 'active');

-- Double-check our secure policies exist and are correct
-- These were created in the previous migration but let's ensure they're there

-- For enrollments: users can only see their own
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrollments' 
    AND policyname = 'Users can view own enrollments'
  ) THEN
    CREATE POLICY "Users can view own enrollments" 
    ON public.enrollments 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- For assignments: users can only see their own
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignments' 
    AND policyname = 'Users can view own assignments'
  ) THEN
    CREATE POLICY "Users can view own assignments" 
    ON public.assignments 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- For payment_info: users can only see their own
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_info' 
    AND policyname = 'Users can view own payment info'
  ) THEN
    CREATE POLICY "Users can view own payment info" 
    ON public.payment_info 
    FOR SELECT 
    USING (
      auth.uid() IN (
        SELECT user_id FROM public.enrollments WHERE id = enrollment_id
      )
    );
  END IF;
END $$;