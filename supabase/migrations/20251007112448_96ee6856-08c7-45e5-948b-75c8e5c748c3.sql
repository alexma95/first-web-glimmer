-- Grant UPDATE permission on products_new table
CREATE POLICY "Allow authenticated updates to products"
ON products_new
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant UPDATE permission on campaigns_new table
CREATE POLICY "Allow authenticated updates to campaigns"
ON campaigns_new
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant INSERT permission on products_new table
CREATE POLICY "Allow authenticated inserts to products"
ON products_new
FOR INSERT
WITH CHECK (true);

-- Grant DELETE permission on products_new table
CREATE POLICY "Allow authenticated deletes to products"
ON products_new
FOR DELETE
USING (true);

-- Grant UPDATE permission on product_text_options table
CREATE POLICY "Allow authenticated updates to text options"
ON product_text_options
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant INSERT permission on product_text_options table
CREATE POLICY "Allow authenticated inserts to text options"
ON product_text_options
FOR INSERT
WITH CHECK (true);