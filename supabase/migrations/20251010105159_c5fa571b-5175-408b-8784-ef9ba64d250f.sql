-- Update the SELECT policy for assignments to allow viewing all assignments
DROP POLICY IF EXISTS "View assignments by enrollment" ON assignments;

CREATE POLICY "View assignments by enrollment"
ON assignments
FOR SELECT
USING (true);