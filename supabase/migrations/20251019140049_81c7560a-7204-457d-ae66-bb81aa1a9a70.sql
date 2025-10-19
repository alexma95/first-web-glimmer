-- Add amount and account tracking to payment_records
ALTER TABLE payment_records 
ADD COLUMN amount DECIMAL(10, 2),
ADD COLUMN account TEXT CHECK (account IN ('A', 'M'));

-- Add comment for clarity
COMMENT ON COLUMN payment_records.amount IS 'Amount paid in USD';
COMMENT ON COLUMN payment_records.account IS 'Payment account used: A or M';