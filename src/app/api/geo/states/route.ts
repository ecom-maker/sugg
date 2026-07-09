import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countryId = request.nextUrl.searchParams.get("countryId");
  if (!countryId) return NextResponse.json({ error: "countryId required" }, { status: 400 });

  const states = await prisma.state.findMany({
    where: { countryId, status: "ACTIVE" },
    orderBy: { stateName: "asc" },
    select: { id: true, stateName: true, stateCode: true, countryId: true, status: true },
  });

  return NextResponse.json({ states });
}
