-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow inserts to campaigns" ON campaigns_new;

-- Create INSERT policy matching the UPDATE policy pattern exactly
CREATE POLICY "Allow inserts to campaigns"
ON campaigns_new
FOR INSERT
TO public
WITH CHECK (true);