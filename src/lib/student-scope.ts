import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/types";
import { getCurrentLead } from "@/lib/student-lead";

export type StudentAccessLevel = "none" | "read" | "write" | "admin";

const WRITE_ROLES = [
  "SUPER_ADMIN",
  "SUGG_COUNSELOR",
  "AGENCY_OWNER",
  "AGENCY_ADMIN",
  "BRANCH_MANAGER",
  "AGENCY_COUNSELOR",
] as const;

export async function getStudentAccess(
  user: AuthUser,
  studentId: string
): Promise<{ level: StudentAccessLevel; student?: Awaited<ReturnType<typeof loadStudent>> }> {
  const student = await loadStudent(studentId);
  if (!student || !student.isActive) return { level: "none" };

  if (user.role === "SUPER_ADMIN") return { level: "admin", student };
  if (user.role === "COLLEGE_ADMIN") return { level: "none" };

  if (user.role === "SUGG_COUNSELOR") {
    if (student.lead?.assignedToId === user.id) return { level: "write", student };
    return { level: "none" };
  }

  if (user.role === "AGENCY_COUNSELOR") {
    if (student.lead?.assignedToId === user.id) return { level: "write", student };
    return { level: "none" };
  }

  if (user.role === "BRANCH_MANAGER") {
    const branch = await prisma.agencyBranch.findFirst({
      where: { managerId: user.id },
      select: { id: true, agencyId: true },
    });
    if (branch && student.branchId === branch.id) return { level: "write", student };
    return { level: "none" };
  }

  if (user.role === "AGENCY_OWNER" || user.role === "AGENCY_ADMIN") {
    const agencyUser = await prisma.agencyUser.findUnique({
      where: { userId: user.id },
      select: { agencyId: true },
    });
    const agencyId =
      agencyUser?.agencyId ??
      (user.role === "AGENCY_OWNER"
        ? (await prisma.agency.findFirst({ where: { ownerId: user.id }, select: { id: true } }))?.id
        : null);

    if (agencyId && student.agencyId === agencyId) return { level: "write", student };
    if (agencyId && student.referral?.agencyId === agencyId) return { level: "write", student };
    return { level: "none" };
  }

  return { level: "none" };
}

export async function requireStudentAccess(
  user: AuthUser,
  studentId: string,
  minLevel: StudentAccessLevel = "read"
): Promise<{ student: NonNullable<Awaited<ReturnType<typeof loadStudent>>> } | { error: string }> {
  const { level, student } = await getStudentAccess(user, studentId);
  if (!student) return { error: "Student not found" };

  const levels: StudentAccessLevel[] = ["none", "read", "write", "admin"];
  if (levels.indexOf(level) < levels.indexOf(minLevel)) {
    return { error: "Unauthorized" };
  }

  return { student };
}

export function canWriteStudent(role: string): boolean {
  return WRITE_ROLES.includes(role as (typeof WRITE_ROLES)[number]);
}

async function loadStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      leads: {
        where: { isCurrent: true },
        take: 1,
        include: {
          assignedTo: { select: { id: true, fullName: true, email: true } },
          followups: {
            where: { status: "PENDING" },
            orderBy: { dueAt: "asc" },
            take: 1,
          },
        },
      },
      agency: { select: { id: true, name: true } },
      branch: { select: { id: true, branchName: true, branchCode: true } },
      referral: { select: { agencyId: true } },
      geoDistrict: { include: { state: { include: { country: true } } } },
      consents: true,
    },
  });
  if (!student) return null;
  const lead = getCurrentLead(student) ?? null;
  return { ...student, lead };
}
