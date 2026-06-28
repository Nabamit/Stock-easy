-- Create pharmacy-documents storage bucket in Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-documents', 'pharmacy-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to read/download documents from the pharmacy-documents bucket
CREATE POLICY "Allow public select on pharmacy-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pharmacy-documents');

-- Policy to allow anonymous uploads during shop registration
CREATE POLICY "Allow public insert on pharmacy-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'pharmacy-documents');
