"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { provisionLogin } from "@/lib/agency-auth";
import { EMPLOYEE_ROLE_MAP, CAPABILITY_KEYS } from "@/lib/capabilities";
import { revalidatePath } from "next/cache";

/**
 * Provision (or reset) a login for an employee. Creates the app user + Supabase
 * auth account, links it to the employee, and returns a one-time temp password.
 * Super Admin only.
 */
export async function provisionEmployeeLogin(employeeId: string) {
  const actor = await getAuthUser();
  if (!actor || actor.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const email = employee.officialEmail || employee.personalEmail;
  if (!email) {
    return { error: "Add an official or personal email to this employee first" };
  }

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const role = EMPLOYEE_ROLE_MAP[employee.employeeType];

  // Reuse an existing user with this email; otherwise create one.
  let userId = employee.userId;
  if (!userId) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      userId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: {
          supabaseId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          email,
          phone: employee.officialPhone || employee.personalPhone || null,
          fullName,
          role,
          isActive: true,
        },
      });
      userId = created.id;
    }
    await prisma.employee.update({ where: { id: employeeId }, data: { userId } });
  }

  // Keep the login's role aligned with the employee type on every (re)provision,
  // so a previously mis-mapped account is repaired. Never demote a Super Admin.
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (current && current.role !== "SUPER_ADMIN" && current.role !== role) {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  const result = await provisionLogin({ userId, email, fullName, role });
  if (result.error) return { error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "PROVISION_EMPLOYEE_LOGIN",
      resource: "employee",
      resourceId: employeeId,
      newValue: { email, role },
    },
  });

  revalidatePath(`/admin/hr/employees/${employeeId}`);
  return { success: true, email: result.email, role, password: result.password };
}

/** Set an employee's capability grants (on their linked login). Super Admin only. */
export async function setEmployeeCapabilities(employeeId: string, capabilities: string[]) {
  const actor = await getAuthUser();
  if (!actor || actor.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const invalid = capabilities.filter((c) => !CAPABILITY_KEYS.includes(c as never));
  if (invalid.length) return { error: `Unknown capability: ${invalid.join(", ")}` };

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: { select: { id: true, capabilities: true } } },
  });
  if (!employee) return { error: "Employee not found" };
  if (!employee.user) {
    return { error: "Provision a login for this employee before granting access" };
  }

  const unique = Array.from(new Set(capabilities));
  await prisma.user.update({
    where: { id: employee.user.id },
    data: { capabilities: unique },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "UPDATE_EMPLOYEE_CAPABILITIES",
      resource: "employee",
      resourceId: employeeId,
      oldValue: { capabilities: employee.user.capabilities },
      newValue: { capabilities: unique },
    },
  });

  revalidatePath(`/admin/hr/employees/${employeeId}`);
  return { success: true };
}
