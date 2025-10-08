-- Create payment records table for tracking all payments
CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Allow viewing payment records
CREATE POLICY "Anyone can view payment records"
ON public.payment_records
FOR SELECT
USING (true);

-- Allow inserting payment records
CREATE POLICY "Anyone can insert payment records"
ON public.payment_records
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_payment_records_enrollment ON public.payment_records(enrollment_id);
CREATE INDEX idx_payment_records_paid_at ON public.payment_records(paid_at DESC);