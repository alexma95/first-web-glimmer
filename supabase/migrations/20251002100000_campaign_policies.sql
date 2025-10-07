-- Grant anonymous insert/update/delete access to campaigns
CREATE POLICY "Public insert campaigns" ON public.campaigns
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update campaigns" ON public.campaigns
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete campaigns" ON public.campaigns
  FOR DELETE
  USING (true);
