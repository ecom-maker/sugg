import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UniversityForm } from "@/components/university/university-form";

export const metadata: Metadata = { title: "Edit University" };

export default async function EditUniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;

  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) notFound();

  return (
    <div className="p-6">
      <UniversityForm university={university} />
    </div>
  );
}
