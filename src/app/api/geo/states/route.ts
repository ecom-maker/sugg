import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: place-name reference data (see /api/geo/countries).
export async function GET(request: NextRequest) {
  const countryId = request.nextUrl.searchParams.get("countryId");
  if (!countryId) return NextResponse.json({ error: "countryId required" }, { status: 400 });

  const states = await prisma.state.findMany({
    where: { countryId, status: "ACTIVE" },
    orderBy: { stateName: "asc" },
    select: { id: true, stateName: true, stateCode: true, countryId: true, status: true },
  });

  return NextResponse.json({ states });
}
