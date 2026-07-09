import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const branch = await prisma.agencyBranch.findUnique({
      where: { id },
      include: {
        agency: { select: { name: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        agencyUsers: {
          include: { user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } } },
        },
        _count: { select: { students: true, leads: true, applications: true, commissions: true } },
        targets: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
      },
    });

    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    return NextResponse.json({ branch });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "AGENCY_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();

  try {
    const branch = await prisma.agencyBranch.update({
      where: { id },
      data: {
        ...(body.branchName && { branchName: body.branchName }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.status && { status: body.status }),
        ...(body.managerId !== undefined && { managerId: body.managerId }),
      },
    });
    return NextResponse.json({ branch });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || !["AGENCY_OWNER", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await prisma.agencyBranch.update({ where: { id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
