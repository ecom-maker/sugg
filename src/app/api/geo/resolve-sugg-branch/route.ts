import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { resolveSuggBranch } from "@/lib/sugg-territory";

/**
 * GET /api/geo/resolve-sugg-branch?districtId=&stateId=&countryId=
 * Internal helper: resolve the covering Sugg Branch for a location
 * (most-specific match wins). Available to authenticated internal roles.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const districtId = searchParams.get("districtId");
  const stateId = searchParams.get("stateId");
  const countryId = searchParams.get("countryId");

  if (!districtId && !stateId && !countryId) {
    return NextResponse.json(
      { error: "Provide at least one of districtId, stateId, countryId" },
      { status: 400 }
    );
  }

  const branch = await resolveSuggBranch({ districtId, stateId, countryId });
  return NextResponse.json({ suggBranch: branch });
}
