-- Grant anonymous insert/update/delete access to products and texts
CREATE POLICY "Public insert products" ON public.products
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update products" ON public.products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete products" ON public.products
  FOR DELETE
  USING (true);

CREATE POLICY "Public insert texts" ON public.texts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update texts" ON public.texts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete texts" ON public.texts
  FOR DELETE
  USING (true);
