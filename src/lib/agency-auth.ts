import { createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── Agency login provisioning (admin-sets-temp-password) ────────────────────
//
// Agency onboarding creates the app `users` row but no real Supabase auth
// credential. This provisions one on demand: a Super Admin generates a
// temporary password, we create (or reset) the Supabase auth user via the
// service-role client, reconcile the app user's supabaseId to the real auth id,
// and return the password once so the admin can share it.

export interface ProvisionResult {
  email: string;
  role: string;
  password?: string;
  error?: string;
}

/** Generate a readable temporary password that satisfies Supabase's policy. */
function tempPassword(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Sugg-${rand}${digits}`;
}

/**
 * Create or reset the Supabase auth account for one app user and reconcile
 * their supabaseId. Email is auto-confirmed so they can sign in immediately.
 */
export async function provisionLogin(target: {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  /** When set, use this exact password; otherwise a temp one is generated. */
  password?: string;
}): Promise<ProvisionResult> {
  // Only echo the password back to the caller when we generated it (so it can
  // be shown once). An admin-supplied password is not returned.
  const generated = !target.password;
  const password = target.password || tempPassword();
  const shown = generated ? password : undefined;
  const base = { email: target.email, role: target.role };

  try {
    const supabase = await createAdminClient();

    // Try to create the auth user.
    const { data, error } = await supabase.auth.admin.createUser({
      email: target.email,
      password,
      email_confirm: true,
      user_metadata: { role: target.role, full_name: target.fullName },
    });

    if (!error && data.user) {
      await prisma.user.update({ where: { id: target.userId }, data: { supabaseId: data.user.id } });
      return { ...base, password: shown };
    }

    // Already exists → find it and reset the password.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find(
      (u) => u.email?.toLowerCase() === target.email.toLowerCase()
    );
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      await prisma.user.update({ where: { id: target.userId }, data: { supabaseId: existing.id } });
      return { ...base, password: shown };
    }

    return { ...base, error: error?.message ?? "Could not create the login account" };
  } catch (err) {
    console.error("[provisionLogin]", err);
    return {
      ...base,
      error: "Provisioning failed — check SUPABASE_SERVICE_ROLE_KEY and Supabase Auth settings.",
    };
  }
}
