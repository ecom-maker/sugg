import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { previewSuggBranchCode } from "@/lib/sugg-branch-code";

/**
 * GET /api/admin/sugg-branches/next-code?countryId=&stateId=&districtId=
 * Preview the auto-generated branch code for the given geography.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const countryId = searchParams.get("countryId");
  const stateId = searchParams.get("stateId");
  const districtId = searchParams.get("districtId");

  if (!countryId) {
    return NextResponse.json({ code: null });
  }

  const code = await previewSuggBranchCode({ countryId, stateId, districtId });
  return NextResponse.json({ code });
}
