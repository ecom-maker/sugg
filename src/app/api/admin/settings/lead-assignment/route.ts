import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  SETTINGS,
  getBoolSetting,
  setSetting,
} from "@/lib/platform-settings";
import { z } from "zod";

const schema = z.object({ territoryAware: z.boolean() });

/** GET /api/admin/settings/lead-assignment — current toggle state. */
export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const territoryAware = await getBoolSetting(SETTINGS.TERRITORY_AWARE_LEAD_ASSIGNMENT, false);
  return NextResponse.json({ territoryAware });
}

/**
 * PUT /api/admin/settings/lead-assignment
 * Toggle territory-aware Sugg-internal lead assignment (OFF by default).
 */
export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { territoryAware } = schema.parse(await request.json());
    await setSetting(SETTINGS.TERRITORY_AWARE_LEAD_ASSIGNMENT, territoryAware ? "true" : "false");
    await logAudit({
      userId: user.id,
      action: "UPDATE_LEAD_ASSIGNMENT_SETTING",
      resource: "platform_setting",
      resourceId: SETTINGS.TERRITORY_AWARE_LEAD_ASSIGNMENT,
      newValue: { territoryAware },
    });
    return NextResponse.json({ territoryAware });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PUT lead-assignment setting]", err);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
