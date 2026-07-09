import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateCourseCommission,
  formatCommissionLabel,
  getCurrencySymbol,
  parseSlabRules,
} from "@/lib/commission-calculator";

/**
 * GET /api/courses/[id]/commission-preview?tuition=80000
 *
 * Public-ish endpoint (readable by authenticated agency/counselor/admin/college users).
 * Returns commission information and expected earnings for a specific course.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tuitionParam = request.nextUrl.searchParams.get("tuition");
    const tuitionAmount = tuitionParam ? Number(tuitionParam) : 0;

    const course = await prisma.course.findUnique({
      where: { id },
      include: { college: { select: { id: true, name: true } } },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!course.commissionType) {
      return NextResponse.json({
        courseId: course.id,
        courseName: course.name,
        college: course.college,
        annualFee: Number(course.annualFee ?? 0),
        totalFee: Number(course.totalFee ?? 0),
        currency: course.commissionCurrency,
        commissionType: null,
        commissionValue: null,
        commissionRules: null,
        expectedCommission: null,
        label: "No commission configured for this course",
        symbol: getCurrencySymbol(course.commissionCurrency),
      });
    }

    const config = {
      commissionType: course.commissionType as "FIXED" | "PERCENTAGE" | "SLAB",
      commissionValue: Number(course.commissionValue ?? 0),
      commissionRules: parseSlabRules(course.commissionRules),
    };

    // Use annual fee as default tuition if not supplied
    const effectiveTuition = tuitionAmount > 0 ? tuitionAmount : Number(course.annualFee ?? 0);
    const result = calculateCourseCommission(config, effectiveTuition, course.commissionCurrency);

    return NextResponse.json({
      courseId: course.id,
      courseName: course.name,
      college: course.college,
      annualFee: Number(course.annualFee ?? 0),
      totalFee: Number(course.totalFee ?? 0),
      currency: course.commissionCurrency,
      symbol: getCurrencySymbol(course.commissionCurrency),
      commissionType: course.commissionType,
      commissionValue: Number(course.commissionValue ?? 0),
      commissionRules: parseSlabRules(course.commissionRules),
      expectedCommission: result?.commissionAmount ?? 0,
      appliedRate: result?.appliedRate ?? null,
      appliedSlab: result?.appliedSlab ?? null,
      label: formatCommissionLabel(config, course.commissionCurrency, effectiveTuition || undefined),
      tuitionUsed: effectiveTuition,
    });
  } catch (err) {
    console.error("[commission-preview]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
