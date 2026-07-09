import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UniversityDetailView } from "@/components/university/university-detail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "University Details" };

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["SUPER_ADMIN", "COLLEGE_ADMIN"]);
  const { id } = await params;
  const canManage = user.role === "SUPER_ADMIN";

  const university = await prisma.university.findUnique({
    where: { id },
    include: {
      colleges: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          status: true,
          logoUrl: true,
          _count: { select: { courses: true, applications: true } },
        },
        orderBy: { name: "asc" },
      },
      _count: { select: { colleges: true } },
      createdBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });

  if (!university) notFound();

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link href="/admin/universities">
          <ArrowLeft className="w-4 h-4" />
          Back to Universities
        </Link>
      </Button>
      <UniversityDetailView university={university} canManage={canManage} />
    </div>
  );
}
