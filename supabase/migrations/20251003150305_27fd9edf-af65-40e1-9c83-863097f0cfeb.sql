-- Add missing RLS policies for campaigns table
CREATE POLICY "Public insert campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete campaigns" 
ON public.campaigns 
FOR DELETE 
USING (true);

-- Add missing RLS policies for products table
CREATE POLICY "Public insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete products" 
ON public.products 
FOR DELETE 
USING (true);

-- Add missing RLS policies for texts table
CREATE POLICY "Public insert texts" 
ON public.texts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update texts" 
ON public.texts 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete texts" 
ON public.texts 
FOR DELETE 
USING (true);