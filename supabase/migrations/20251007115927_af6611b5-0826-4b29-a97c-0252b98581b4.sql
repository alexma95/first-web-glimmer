-- Add INSERT policy for campaigns_new table
CREATE POLICY "Allow authenticated inserts to campaigns"
ON campaigns_new
FOR INSERT
TO authenticated
WITH CHECK (true);