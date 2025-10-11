-- Update clone_campaign function to also clone products and text options
CREATE OR REPLACE FUNCTION public.clone_campaign(p_campaign_id uuid, p_clone_products boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_campaign_id UUID;
  v_product_record RECORD;
  v_new_product_id UUID;
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
  
  -- Clone products if requested
  IF p_clone_products THEN
    FOR v_product_record IN 
      SELECT * FROM products_new WHERE campaign_id = p_campaign_id
    LOOP
      -- Clone the product
      INSERT INTO products_new (
        campaign_id,
        title,
        review_link_url,
        resource_link_url,
        position,
        status
      )
      VALUES (
        v_new_campaign_id,
        v_product_record.title,
        v_product_record.review_link_url,
        v_product_record.resource_link_url,
        v_product_record.position,
        v_product_record.status
      )
      RETURNING id INTO v_new_product_id;
      
      -- Clone text options for this product
      INSERT INTO product_text_options (
        product_id,
        text_md,
        status
      )
      SELECT 
        v_new_product_id,
        text_md,
        'available'
      FROM product_text_options
      WHERE product_id = v_product_record.id;
    END LOOP;
  END IF;
  
  RETURN v_new_campaign_id;
END;
$function$;