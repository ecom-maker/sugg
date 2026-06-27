import { NextRequest, NextResponse } from "next/server";
import { createInactivityFollowups } from "@/lib/lead-assignment";

// This route should be called by a cron job (e.g., Vercel Cron)
// Schedule: every day at 9 AM
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await createInactivityFollowups();

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
