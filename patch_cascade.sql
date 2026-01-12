-- Patch to add ON UPDATE CASCADE to existing database
-- Run this in Supabase SQL Editor if you already have data and don't want to reset.

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE transactions
DROP CONSTRAINT transactions_product_name_fkey;

-- 2. Re-add constraint with ON UPDATE CASCADE
ALTER TABLE transactions
ADD CONSTRAINT transactions_product_name_fkey
FOREIGN KEY (product_name)
REFERENCES products(name)
ON UPDATE CASCADE;

COMMIT;
