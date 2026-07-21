import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://sugg.vercel.app").replace(/\/$/, "");

/**
 * Generate a Supabase password-recovery token for an email and deliver a reset
 * link via the app's own SMTP (nodemailer) — the same transport used for OTP
 * emails. We build the link against OUR OWN /auth/callback route using the
 * token hash (rather than Supabase's action_link) so it does NOT depend on the
 * Supabase project's Site URL / redirect allow-list — otherwise the link's
 * redirect falls back to the Site URL (e.g. http://localhost:3000). Our
 * callback verifies the token server-side and redirects to /reset-password.
 * Best-effort: returns { sent, error } and never throws. For a non-existent
 * account generateLink errors, which we report as not sent (callers that must
 * not reveal account existence should ignore the result).
 */
export async function sendResetLink(email: string): Promise<{ sent: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { sent: false, error: "No email" };

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: clean,
    });

    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      return { sent: false, error: error?.message ?? "Could not generate a reset link" };
    }

    // Point the email at our own domain; /auth/callback verifies the token and
    // then redirects to the reset page. Independent of Supabase's Site URL.
    const link = `${APP_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent("/reset-password")}`;

    return await sendPasswordResetEmail(clean, link);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sendResetLink]", message, err);
    return { sent: false, error: message };
  }
}
