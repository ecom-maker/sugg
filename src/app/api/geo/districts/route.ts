import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stateId = request.nextUrl.searchParams.get("stateId");
  if (!stateId) return NextResponse.json({ error: "stateId required" }, { status: 400 });

  const districts = await prisma.district.findMany({
    where: { stateId, status: "ACTIVE" },
    orderBy: { districtName: "asc" },
    select: { id: true, districtName: true, stateId: true, status: true },
  });

  return NextResponse.json({ districts });
}
