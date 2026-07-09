import type { Metadata } from "next";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { Student360View } from "@/components/students/student-360-view";
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

  return (
    <div className="p-6">
      <Student360View studentId={id} isSuperAdmin={user.role === "SUPER_ADMIN"} />
    </div>
  );
}
