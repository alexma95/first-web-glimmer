-- Create a helper function to find duplicate text options
CREATE OR REPLACE FUNCTION public.find_duplicate_text_options()
RETURNS TABLE (
  product_id uuid,
  text_md text,
  duplicate_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    product_id,
    text_md,
    COUNT(*) as duplicate_count
  FROM product_text_options
  GROUP BY product_id, text_md
  HAVING COUNT(*) > 1;
$$;

-- Update claim_text_option function to prevent assigning duplicate texts to same user
CREATE OR REPLACE FUNCTION public.claim_text_option(p_product_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_text_id UUID;
  v_assigned_text_md TEXT;
BEGIN
  -- Normalize email
  p_email := LOWER(p_email);
  
  -- Check if user already has an assignment for this product
  SELECT text_md INTO v_assigned_text_md
  FROM product_text_options
  WHERE product_id = p_product_id 
    AND assigned_to_email = p_email
    AND status = 'assigned'
  LIMIT 1;
  
  -- Atomically claim one available text that hasn't been assigned to this user
  UPDATE product_text_options
  SET 
    status = 'assigned',
    assigned_to_email = p_email,
    assigned_at = NOW()
  WHERE id = (
    SELECT id 
    FROM product_text_options
    WHERE product_id = p_product_id 
      AND status = 'available'
      -- Exclude text that user already has for this product
      AND (v_assigned_text_md IS NULL OR text_md != v_assigned_text_md)
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_text_id;
  
  RETURN v_text_id;
END;
$function$;