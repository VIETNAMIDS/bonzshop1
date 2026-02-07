-- Create storage policies for bank-qr bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own bank QR"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bank-qr' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
  OR bucket_id = 'bank-qr' 
  AND (string_to_array(name, '/'))[1] = 'withdrawals'
  AND auth.uid() IS NOT NULL
);

-- Allow users to view their own uploaded files
CREATE POLICY "Users can view bank QR files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bank-qr');

-- Allow users to update their own files
CREATE POLICY "Users can update their own bank QR"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'bank-qr' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own bank QR"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bank-qr' AND auth.uid() IS NOT NULL);