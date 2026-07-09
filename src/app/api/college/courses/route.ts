import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import type { CommissionType } from "@prisma/client";

const slabRuleSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(1),
  percentage: z.number().min(0).max(100),
});

const courseSchema = z.object({
  name: z.string().min(2),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]),
  duration: z.string().min(1),
  durationMonths: z.number().int().min(1).optional(),
  eligibility: z.string().optional(),
  totalSeats: z.number().int().min(1).optional(),
  annualFee: z.number().min(0).optional(),
  totalFee: z.number().min(0).optional(),
  description: z.string().optional(),
  // Commission
  commissionType: z.enum(["FIXED", "PERCENTAGE", "SLAB"]).optional(),
  commissionValue: z.number().min(0).optional(),
  commissionCurrency: z.string().default("INR"),
  commissionRules: z.array(slabRuleSchema).optional(),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });
  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

  const courses = await prisma.course.findMany({
    where: { collegeId: college.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({ courses });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = courseSchema.parse(body);

    const college = await prisma.college.findFirst({
      where: { admin: { supabaseId: user.supabaseId } },
    });
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

    const { commissionType, commissionValue, commissionCurrency, commissionRules, ...rest } = data;
    const course = await prisma.course.create({
      data: {
        ...rest,
        collegeId: college.id,
        isActive: true,
        commissionType: (commissionType as CommissionType) ?? null,
        commissionValue: commissionValue ?? null,
        commissionCurrency: commissionCurrency ?? "INR",
        commissionRules: commissionRules && commissionRules.length > 0 ? commissionRules : undefined,
      },
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
