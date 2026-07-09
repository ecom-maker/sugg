import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_STUDENT_DOCUMENTS ?? "student-documents";
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateStudentDocument(file: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "File type not allowed. Use PDF, JPG, PNG, or DOCX.";
  }
  if (file.size > MAX_SIZE) {
    return "File exceeds 10 MB limit.";
  }
  return null;
}

export function getStudentDocumentPath(studentId: string, documentId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${studentId}/${documentId}/${safe}`;
}

export async function uploadStudentDocument(
  path: string,
  file: Buffer,
  mimeType: string
): Promise<{ path: string } | { error: string }> {
  const supabase = await createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path };
}

export async function getSignedDocumentUrl(path: string, expiresIn = 300): Promise<string | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteStudentDocumentFile(path: string): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
