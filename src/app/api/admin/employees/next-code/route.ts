import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { nextEmployeeCode } from "@/lib/employee-code";

/** GET /api/admin/employees/next-code — preview of the next system code. */
export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = await nextEmployeeCode();
  return NextResponse.json({ code });
}
