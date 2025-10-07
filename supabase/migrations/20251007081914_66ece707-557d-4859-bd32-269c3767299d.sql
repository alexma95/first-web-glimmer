-- Add fields for uploads, links, and instructions

-- Add link field to products table
ALTER TABLE public.products
ADD COLUMN link text;

-- Add instructions field to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN instructions text;

-- Add upload_url field to assignment_texts (already exists based on schema)
-- No change needed as upload_url is already in assignment_texts

COMMENT ON COLUMN public.products.link IS 'Optional link associated with the product';
COMMENT ON COLUMN public.campaigns.instructions IS 'Instructions displayed on the assignment page';