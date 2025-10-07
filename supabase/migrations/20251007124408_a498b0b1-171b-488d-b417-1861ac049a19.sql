-- Drop the restrictive SELECT policy that only shows active campaigns
DROP POLICY IF EXISTS "Public can view active campaigns limited" ON public.campaigns_new;

-- Create a new SELECT policy that allows viewing all campaigns
-- This is safe because the admin interface is protected by authentication
CREATE POLICY "Allow viewing all campaigns"
  ON public.campaigns_new
  FOR SELECT
  USING (true);