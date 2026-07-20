import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://sugg.vercel.app").replace(/\/$/, "");

/**
 * Generate a Supabase password-recovery link for an email and deliver it via
 * the app's own SMTP (nodemailer) — the same transport used for OTP emails.
 * We do this instead of relying on Supabase's built-in email so reset links
 * are actually delivered. Best-effort: returns { sent, error } and never throws.
 * For a non-existent account generateLink errors, which we report as not sent
 * (callers that must not reveal account existence should ignore the result).
 */
export async function sendResetLink(email: string): Promise<{ sent: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { sent: false, error: "No email" };

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: clean,
      options: { redirectTo: `${APP_URL}/auth/callback?next=/reset-password` },
    });

    const link = data?.properties?.action_link;
    if (error || !link) {
      return { sent: false, error: error?.message ?? "Could not generate a reset link" };
    }

    return await sendPasswordResetEmail(clean, link);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendResetLink]", message, err);
    return { sent: false, error: message };
  }
}
