"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { provisionLogin } from "@/lib/agency-auth";
import { revalidatePath } from "next/cache";

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
