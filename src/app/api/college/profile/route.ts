import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
    include: {
      _count: { select: { courses: true, applications: true } },
      collegeUsers: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
    },
  });

  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });
  return NextResponse.json({ college });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

  const updated = await prisma.college.update({
    where: { id: college.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.state !== undefined && { state: body.state }),
      ...(body.country !== undefined && { country: body.country }),
    },
  });

  return NextResponse.json({ college: updated });
}
