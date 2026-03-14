-- Create receipts storage bucket for coin purchase bills
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public viewing of receipts
CREATE POLICY "Receipts are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Allow users to update their own receipts
CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to view all receipts
CREATE POLICY "Admins can manage all receipts"
ON storage.objects FOR ALL
USING (bucket_id = 'receipts' AND is_admin(auth.uid()));