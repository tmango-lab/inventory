-- Add images column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
