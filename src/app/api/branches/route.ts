import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agencyId");
  const status = searchParams.get("status");

  try {
    const agency = await prisma.agency.findFirst({
      where: {
        OR: [
          { owner: { supabaseId: user.supabaseId } },
          { agencyUsers: { some: { user: { supabaseId: user.supabaseId } } } },
          ...(user.role === "SUPER_ADMIN" && agencyId ? [{ id: agencyId }] : []),
        ],
      },
    });

    if (!agency && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No agency access" }, { status: 403 });
    }

    const branches = await prisma.agencyBranch.findMany({
      where: {
        agencyId: agency?.id ?? agencyId ?? undefined,
        ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}),
      },
      orderBy: { branchName: "asc" },
      include: {
        manager: { select: { id: true, fullName: true, email: true } },
        _count: { select: { agencyUsers: true, students: true, leads: true, applications: true } },
      },
    });

    return NextResponse.json({ branches });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
