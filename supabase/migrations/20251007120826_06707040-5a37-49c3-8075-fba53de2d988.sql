-- Create a secure function to clone campaigns with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.clone_campaign(p_campaign_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_campaign_id UUID;
BEGIN
  -- Insert the cloned campaign
  INSERT INTO campaigns_new (
    name,
    status,
    support_email,
    required_products_count,
    welcome_text_md,
    payment_instructions_md
  )
  SELECT 
    name || ' (Copy)',
    'paused',
    support_email,
    required_products_count,
    welcome_text_md,
    payment_instructions_md
  FROM campaigns_new
  WHERE id = p_campaign_id
  RETURNING id INTO v_new_campaign_id;
  
  RETURN v_new_campaign_id;
END;
$$;