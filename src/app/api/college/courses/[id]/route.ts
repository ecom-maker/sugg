import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import type { CommissionType } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]).optional(),
  duration: z.string().min(1).optional(),
  durationMonths: z.number().int().min(1).optional(),
  eligibility: z.string().optional(),
  totalSeats: z.number().int().min(1).optional(),
  availableSeats: z.number().int().min(0).optional(),
  annualFee: z.number().min(0).optional(),
  totalFee: z.number().min(0).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  // Commission
  commissionType: z.enum(["FIXED", "PERCENTAGE", "SLAB"]).nullable().optional(),
  commissionValue: z.number().min(0).nullable().optional(),
  commissionCurrency: z.string().optional(),
  commissionRules: z.array(z.object({ min: z.number(), max: z.number(), percentage: z.number() })).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      college: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Verify ownership (College Admin can only edit own college's courses)
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.role === "COLLEGE_ADMIN") {
      const college = await prisma.college.findFirst({
        where: { admin: { supabaseId: user.supabaseId } },
      });
      if (!college || college.id !== course.collegeId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const { commissionType, commissionValue, commissionCurrency, commissionRules, ...rest } = data;

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...rest,
        ...(commissionType !== undefined && { commissionType: (commissionType as CommissionType) ?? null }),
        ...(commissionValue !== undefined && { commissionValue: commissionValue ?? null }),
        ...(commissionCurrency !== undefined && { commissionCurrency }),
        ...(commissionRules !== undefined && { commissionRules: commissionRules ?? undefined }),
      },
    });

    return NextResponse.json({ course: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { applications: true } } },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (course._count.applications > 0) {
    await prisma.course.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Course deactivated (has applications)" });
  }
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ message: "Course deleted" });
}
