import type { Metadata } from "next";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-scope";
import { Student360View } from "@/components/students/student-360-view";
import { ChangeHistory, type ChangeLogEntry } from "@/components/shared/change-history";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Student Profile" };

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) notFound();

  // Change history: student activity (edits, documents, education, shortlists…)
  // plus this student's application status changes — who did it and when.
  const studentAudit = await prisma.auditLog.findMany({
    where: { resource: "Student", resourceId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, action: true, oldValue: true, newValue: true, createdAt: true, user: { select: { fullName: true, email: true } } },
  });

  const appHistory = await prisma.applicationStatusHistory.findMany({
    where: { application: { studentId: id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      changedById: true,
      application: { select: { college: { select: { name: true } } } },
    },
  });
  const changerIds = [...new Set(appHistory.map((h) => h.changedById).filter(Boolean))] as string[];
  const changers = changerIds.length
    ? await prisma.user.findMany({ where: { id: { in: changerIds } }, select: { id: true, fullName: true, email: true } })
    : [];
  const changerMap = new Map(changers.map((u) => [u.id, { fullName: u.fullName, email: u.email }]));

  const appEntries: ChangeLogEntry[] = appHistory.map((h) => ({
    id: h.id,
    action: "UPDATE_APPLICATION_STATUS",
    oldValue: {},
    newValue: { collegeName: h.application.college.name, status: h.status, reason: h.reason ?? undefined },
    createdAt: h.createdAt,
    user: h.changedById ? changerMap.get(h.changedById) ?? null : null,
  }));

  const history: ChangeLogEntry[] = [...studentAudit, ...appEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="p-6 space-y-6">
      <Student360View studentId={id} isSuperAdmin={user.role === "SUPER_ADMIN"} />
      <ChangeHistory entries={history} title="Change history" />
    </div>
  );
}
