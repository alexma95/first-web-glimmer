-- Add DELETE policies for enrollment-related tables

-- Allow DELETE on enrollments
CREATE POLICY "Allow authenticated deletes to enrollments"
ON enrollments
FOR DELETE
USING (true);

-- Allow DELETE on assignments
CREATE POLICY "Allow authenticated deletes to assignments"
ON assignments
FOR DELETE
USING (true);

-- Allow DELETE on payment_info
CREATE POLICY "Allow authenticated deletes to payment_info"
ON payment_info
FOR DELETE
USING (true);

-- Allow DELETE on payment_records
CREATE POLICY "Allow authenticated deletes to payment_records"
ON payment_records
FOR DELETE
USING (true);