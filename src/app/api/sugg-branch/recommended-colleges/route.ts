import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/sugg-branch/recommended-colleges?courses=a,b&budget=200000
 * Colleges offering the interested course(s), with a course fee within ±15% of
 * the budget. Read-only reference for the Add Lead form.
 */
export async function GET(request: NextRequest) {
  // Read-only college/course/fee reference lookup — any authenticated user
  // (branch managers, counselors) may use it while capturing a lead.
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const terms = (sp.get("courses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const budget = Number(sp.get("budget") ?? "0");

  if (terms.length === 0) return NextResponse.json({ colleges: [] });

  const courses = await prisma.course.findMany({
    where: {
      college: { status: "APPROVED" },
      OR: terms.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })),
    },
    select: {
      id: true,
      name: true,
      degreeType: true,
      totalFee: true,
      annualFee: true,
      college: { select: { id: true, name: true, city: true, state: true } },
    },
    take: 200,
  });

  const rows = courses.map((c) => {
    const fee = c.totalFee ?? c.annualFee;
    return {
      courseId: c.id,
      collegeId: c.college.id,
      collegeName: c.college.name,
      location: [c.college.city, c.college.state].filter(Boolean).join(", "),
      courseName: c.name,
      degreeType: c.degreeType,
      fee: fee != null ? Number(fee) : null,
    };
  });

  let filtered = rows;
  if (budget > 0) {
    const low = budget * 0.85;
    const high = budget * 1.15;
    filtered = rows.filter((r) => r.fee != null && r.fee >= low && r.fee <= high);
  }

  filtered.sort((a, b) => {
    if (budget > 0 && a.fee != null && b.fee != null) {
      return Math.abs(a.fee - budget) - Math.abs(b.fee - budget);
    }
    return (a.fee ?? Infinity) - (b.fee ?? Infinity);
  });

  return NextResponse.json({ colleges: filtered.slice(0, 12) });
}
