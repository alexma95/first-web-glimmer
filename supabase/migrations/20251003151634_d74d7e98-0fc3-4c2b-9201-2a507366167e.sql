-- Drop and recreate claim_text with unambiguous parameter names
DROP FUNCTION IF EXISTS public.claim_text(uuid, uuid);

CREATE FUNCTION public.claim_text(p_assignment_id uuid, p_product_id uuid)
RETURNS public.texts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_text public.texts%ROWTYPE;
BEGIN
  SELECT t.*
  INTO claimed_text
  FROM public.texts AS t
  WHERE t.product_id = p_product_id
    AND t.is_assigned = false
  ORDER BY t.option_number
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'NO_TEXTS_AVAILABLE';
  END IF;

  UPDATE public.texts
  SET is_assigned = true
  WHERE id = claimed_text.id;

  claimed_text.is_assigned := true;

  RETURN claimed_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_text(uuid, uuid) TO anon, authenticated;
COMMENT ON FUNCTION public.claim_text(uuid, uuid) IS 'Claims the next available text for a product and returns it.';