-- Insert seed campaign
INSERT INTO campaigns_new (name, status, required_products_count, support_email)
VALUES ('Book Review Campaign', 'active', 4, 'prestigiousprepeducation@gmail.com')
ON CONFLICT DO NOTHING;

-- Get campaign ID for products
DO $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT id INTO v_campaign_id FROM campaigns_new WHERE status = 'active' LIMIT 1;
  
  -- Insert sample products
  INSERT INTO products_new (campaign_id, position, title, review_link_url, resource_link_url, status)
  VALUES 
    (v_campaign_id, 1, 'COGAT Grade 5 Test Prep', 'https://amazon.com/review/1', 'https://example.com/book1', 'active'),
    (v_campaign_id, 2, 'Math Workbook Grade 6', 'https://amazon.com/review/2', 'https://example.com/book2', 'active'),
    (v_campaign_id, 3, 'Science Practice Tests', 'https://amazon.com/review/3', 'https://example.com/book3', 'active'),
    (v_campaign_id, 4, 'Reading Comprehension Guide', 'https://amazon.com/review/4', 'https://example.com/book4', 'active')
  ON CONFLICT DO NOTHING;
END $$;