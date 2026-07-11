import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/admin/users
 * Super Admin only. Lightweight user lookup for pickers (e.g. assigning a Sugg
 * Branch Manager). Query: q (name/email search), role, limit.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "";
  const limit = Math.min(50, Number(searchParams.get("limit") ?? "20"));

  const where: Record<string, unknown> = { isActive: true };
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where: where as never,
    orderBy: { fullName: "asc" },
    take: limit,
    select: { id: true, fullName: true, email: true, role: true },
  });

  return NextResponse.json({ users });
}
