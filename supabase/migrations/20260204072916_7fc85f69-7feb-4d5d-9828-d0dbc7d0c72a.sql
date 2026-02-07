-- Create bank-qr storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-qr', 'bank-qr', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for bank-qr bucket
CREATE POLICY "Sellers can upload their bank QR"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bank-qr' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view bank QR"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-qr');

CREATE POLICY "Sellers can update their bank QR"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bank-qr' AND auth.uid()::text = (storage.foldername(name))[1]);