import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: place-name reference data (see /api/geo/countries).
export async function GET(request: NextRequest) {
  const stateId = request.nextUrl.searchParams.get("stateId");
  if (!stateId) return NextResponse.json({ error: "stateId required" }, { status: 400 });

  const districts = await prisma.district.findMany({
    where: { stateId, status: "ACTIVE" },
    orderBy: { districtName: "asc" },
    select: { id: true, districtName: true, stateId: true, status: true },
  });

  return NextResponse.json({ districts });
}
