-- ============================================================
-- Supabase Storage: student-documents bucket policies
-- Run after creating bucket "student-documents" (private) in dashboard
-- ============================================================

-- Create bucket (if using SQL extension)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Service role has full access (signed URL generation happens server-side)
CREATE POLICY IF NOT EXISTS "Service role full access student documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'student-documents')
WITH CHECK (bucket_id = 'student-documents');

-- Authenticated users: no direct access (signed URLs only via API)
CREATE POLICY IF NOT EXISTS "No public access student documents"
ON storage.objects FOR SELECT
TO anon
USING (false);
