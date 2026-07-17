import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: place-name reference data used by the (pre-auth) college/agency
// self-registration forms as well as authenticated dashboards.
export async function GET() {
  const countries = await prisma.country.findMany({
    where: { status: "ACTIVE" },
    orderBy: { countryName: "asc" },
    select: { id: true, countryName: true, countryCode: true, status: true },
  });

  return NextResponse.json({ countries });
}
