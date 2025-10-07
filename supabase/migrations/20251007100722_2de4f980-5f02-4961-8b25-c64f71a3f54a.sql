-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE payment_method AS ENUM ('paypal', 'wise', 'bank_wire');
CREATE TYPE enrollment_state AS ENUM ('assigned', 'in_progress', 'submitted', 'approved', 'paid');
CREATE TYPE product_status AS ENUM ('active', 'hidden');
CREATE TYPE text_option_status AS ENUM ('available', 'assigned', 'disabled');
CREATE TYPE assignment_status_type AS ENUM ('assigned', 'proof_uploaded', 'accepted', 'rejected');

-- Drop existing tables if they exist
DROP TABLE IF EXISTS payment_info CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS product_text_options CASCADE;
DROP TABLE IF EXISTS products_new CASCADE;
DROP TABLE IF EXISTS campaigns_new CASCADE;
DROP TABLE IF EXISTS files CASCADE;

-- Create campaigns table
CREATE TABLE campaigns_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  required_products_count INTEGER NOT NULL DEFAULT 4,
  welcome_text_md TEXT NOT NULL DEFAULT 'Make a quick $8-10 by sharing your thoughts on 4-5 books! It takes less than 3 minutes!

Here''s the instructions:

Download the books or its summary
(You decide if and how much you want to read—no obligations.)

Write your review on Amazon (Click on the links)

Take Screenshots of your published reviews

Submit Proof (Upload the reviews screenshots) & Payment Info to get paid

Please before leaving a negative review contact me! 5 stars is what we are aiming at!

That''s it! 
Payment processed within 2 business days (often is immediate) after proof submission.

Need help? Contact: prestigiousprepeducation@gmail.com

Click on the Link to leave the review.',
  support_email TEXT NOT NULL DEFAULT 'prestigiousprepeducation@gmail.com',
  payment_instructions_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE products_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns_new(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  review_link_url TEXT NOT NULL,
  resource_link_url TEXT NOT NULL,
  status product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create product_text_options table
CREATE TABLE product_text_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,
  text_md TEXT NOT NULL,
  status text_option_status NOT NULL DEFAULT 'available',
  assigned_to_email TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint for assignment
CREATE UNIQUE INDEX unique_text_assignment ON product_text_options (id) 
WHERE status = 'assigned' AND assigned_to_email IS NOT NULL;

-- Create enrollments table
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns_new(id) ON DELETE CASCADE,
  state enrollment_state NOT NULL DEFAULT 'assigned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, campaign_id)
);

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products_new(id) ON DELETE CASCADE,
  text_option_id UUID NOT NULL REFERENCES product_text_options(id) ON DELETE CASCADE,
  text_snapshot_md TEXT NOT NULL,
  status assignment_status_type NOT NULL DEFAULT 'assigned',
  proof_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enrollment_id, product_id)
);

-- Create payment_info table
CREATE TABLE payment_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  email TEXT,
  full_name TEXT,
  bank_account_number TEXT,
  bank_details TEXT,
  address_full TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enrollment_id)
);

-- Create indexes
CREATE INDEX idx_products_campaign ON products_new(campaign_id, position);
CREATE INDEX idx_text_options_product ON product_text_options(product_id);
CREATE INDEX idx_text_options_status ON product_text_options(status) WHERE status = 'available';
CREATE INDEX idx_enrollments_email ON enrollments(email);
CREATE INDEX idx_assignments_enrollment ON assignments(enrollment_id);

-- Enable RLS
ALTER TABLE campaigns_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_text_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for active data, write allowed for users)
CREATE POLICY "Public can view active campaigns" ON campaigns_new
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view active products" ON products_new
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view available text options" ON product_text_options
  FOR SELECT USING (status = 'available' OR status = 'assigned');

CREATE POLICY "Public can insert enrollments" ON enrollments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own enrollments" ON enrollments
  FOR SELECT USING (true);

CREATE POLICY "Public can update own enrollments" ON enrollments
  FOR UPDATE USING (true);

CREATE POLICY "Public can insert assignments" ON assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view assignments" ON assignments
  FOR SELECT USING (true);

CREATE POLICY "Public can update assignments" ON assignments
  FOR UPDATE USING (true);

CREATE POLICY "Public can insert files" ON files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view files" ON files
  FOR SELECT USING (true);

CREATE POLICY "Public can insert payment info" ON payment_info
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view payment info" ON payment_info
  FOR SELECT USING (true);

-- Create storage bucket for proof uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can upload proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Public can view proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'proofs');

-- Function to atomically claim a text option
CREATE OR REPLACE FUNCTION claim_text_option(
  p_product_id UUID,
  p_email TEXT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_text_id UUID;
BEGIN
  -- Atomically claim one available text
  UPDATE product_text_options
  SET 
    status = 'assigned',
    assigned_to_email = LOWER(p_email),
    assigned_at = NOW()
  WHERE id = (
    SELECT id 
    FROM product_text_options
    WHERE product_id = p_product_id 
      AND status = 'available'
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_text_id;
  
  RETURN v_text_id;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();