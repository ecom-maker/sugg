import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/universities/[id]/archive
 * Super Admin only — soft archive via status change
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.university.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.university.update({
    where: { id },
    data: { status: "ARCHIVED", updatedById: user.id },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UNIVERSITY_ARCHIVED",
      resource: "University",
      resourceId: id,
      oldValue: { status: existing.status },
      newValue: { status: "ARCHIVED" },
    },
  });

  return NextResponse.json({ university: updated });
}
