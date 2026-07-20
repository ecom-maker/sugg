"use server";

import { sendResetLink } from "@/lib/password-reset";

/**
 * Self-service "forgot password": email a reset link via the app's SMTP.
 * Always returns success so we never reveal whether an account exists.
 */
export async function requestPasswordReset(email: string): Promise<{ success: true }> {
  const clean = email.trim().toLowerCase();
  if (clean) {
    await sendResetLink(clean).catch(() => {});
  }
  return { success: true };
}
