-- Run this in your Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tags text[];

-- Optional: Update existing rows to have empty array instead of null (if needed)
UPDATE products SET tags = '{}' WHERE tags IS NULL;
