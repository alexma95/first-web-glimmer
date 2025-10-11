-- Add DELETE policy for campaigns_new table
CREATE POLICY "Allow authenticated deletes to campaigns"
ON campaigns_new
FOR DELETE
USING (true);