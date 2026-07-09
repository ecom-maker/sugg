import { NextResponse } from "next/server";
import { processExpiringDocuments } from "@/actions/student-profile";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processExpiringDocuments();
  return NextResponse.json(result);
}
