import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { autoAssignExistingAgencies } from "@/lib/sugg-territory";

/**
 * POST /api/admin/sugg-branches/auto-assign
 * One-time best-effort mapping of existing agencies to their covering Sugg
 * Branch by geography. Unmatched agencies are reported (and remain unassigned).
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoAssignExistingAgencies(user.id);
    return NextResponse.json({
      success: true,
      assigned: result.assigned,
      unmatched: result.unmatched,
      details: result.details,
    });
  } catch (err) {
    console.error("[POST auto-assign]", err);
    return NextResponse.json({ error: "Auto-assign failed" }, { status: 500 });
  }
}
