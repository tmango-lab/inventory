-- Create a new public bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow Public Read Access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Policy: Allow Authenticated (or Anon for now) Uploads
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );

-- Policy: Allow Update/Delete (Optional, consistent with loose permissions for now)
CREATE POLICY "Allow Updates"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-images' );

CREATE POLICY "Allow Deletes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-images' );
