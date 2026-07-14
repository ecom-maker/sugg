"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { provisionLogin } from "@/lib/agency-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Change a college's login (admin) email. Super Admin only. Updates the app
 * user and the Supabase auth account (when one exists).
 */
export async function changeCollegeLoginEmail(collegeId: string, newEmailRaw: string) {
  const actor = await getAuthUser();
  if (!actor || actor.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const newEmail = newEmailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return { error: "Enter a valid email address" };

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true, admin: { select: { id: true, email: true, supabaseId: true } } },
  });
  if (!college) return { error: "College not found" };
  if (!college.admin) return { error: "This college has no login yet — use Reset password to create one first." };
  if (college.admin.email.toLowerCase() === newEmail) return { error: "That is already the login email" };

  const clash = await prisma.user.findFirst({
    where: { email: newEmail, NOT: { id: college.admin.id } },
    select: { id: true },
  });
  if (clash) return { error: "That email is already in use by another account" };

  // Update the Supabase auth email if a real auth account exists.
  if (college.admin.supabaseId && !college.admin.supabaseId.startsWith("pending-")) {
    const supabase = await createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(college.admin.supabaseId, {
      email: newEmail,
      email_confirm: true,
    });
    if (error) return { error: `Could not update the login: ${error.message}` };
  }

  await prisma.user.update({ where: { id: college.admin.id }, data: { email: newEmail } });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "CHANGE_COLLEGE_LOGIN_EMAIL",
      resource: "college",
      resourceId: collegeId,
      oldValue: { email: college.admin.email },
      newValue: { email: newEmail },
    },
  });

  revalidatePath(`/admin/colleges/${collegeId}/edit`);
  return { success: true, email: newEmail };
}

/**
 * Reset (or provision) the login for a college's admin account. Super Admin
 * only. If a password is supplied it is used; otherwise a temp one is generated
 * and returned once.
 */
export async function resetCollegeLogin(collegeId: string, opts?: { password?: string }) {
  const actor = await getAuthUser();
  if (!actor || actor.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: {
      id: true, name: true, officialEmail: true, contactPersonName: true,
      adminId: true, admin: { select: { id: true, email: true } },
    },
  });
  if (!college) return { error: "College not found" };

  const email = (college.admin?.email || college.officialEmail || "").trim();
  if (!email) return { error: "This college has no email to attach a login to" };
  if (opts?.password !== undefined && opts.password.length > 0 && opts.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const fullName = college.contactPersonName || college.name;

  // Ensure a login user exists and is linked as the college admin.
  let userId = college.adminId;
  if (!userId) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      userId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: {
          supabaseId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          email,
          fullName,
          role: "COLLEGE_ADMIN",
          isActive: true,
        },
      });
      userId = created.id;
    }
    await prisma.college.update({ where: { id: collegeId }, data: { adminId: userId } });
  }

  const result = await provisionLogin({
    userId,
    email,
    fullName,
    role: "COLLEGE_ADMIN",
    password: opts?.password || undefined,
  });
  if (result.error) return { error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "RESET_COLLEGE_LOGIN",
      resource: "college",
      resourceId: collegeId,
      newValue: { email, passwordSet: Boolean(opts?.password) },
    },
  });

  revalidatePath(`/admin/colleges/${collegeId}/edit`);
  return { success: true, email: result.email, password: result.password };
}
