-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Fix search_path for claim_text_option function
CREATE OR REPLACE FUNCTION claim_text_option(
  p_product_id UUID,
  p_email TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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