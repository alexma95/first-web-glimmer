-- Create assignment_screenshots table
CREATE TABLE public.assignment_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.user_assignments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  drive_file_id TEXT,
  drive_view_url TEXT,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS on assignment_screenshots
ALTER TABLE public.assignment_screenshots ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access consistent with existing strategy
CREATE POLICY "Public manage assignment screenshots" ON public.assignment_screenshots FOR ALL USING (true);
