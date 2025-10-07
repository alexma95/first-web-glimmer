-- Drop the authenticated-only policy and replace with one that allows all inserts
DROP POLICY IF EXISTS "Allow authenticated inserts to campaigns" ON campaigns_new;

CREATE POLICY "Allow inserts to campaigns"
ON campaigns_new
FOR INSERT
WITH CHECK (true);