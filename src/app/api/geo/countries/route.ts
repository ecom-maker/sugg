import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countries = await prisma.country.findMany({
    where: { status: "ACTIVE" },
    orderBy: { countryName: "asc" },
    select: { id: true, countryName: true, countryCode: true, status: true },
  });

  return NextResponse.json({ countries });
}
