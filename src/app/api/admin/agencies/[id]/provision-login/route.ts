import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { provisionLogin } from "@/lib/agency-auth";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/agencies/[id]/provision-login
 * Super Admin: (re)issues Supabase login credentials for the agency's owner and
 * manager (Agency Admin), returning a temporary password once. Idempotent —
 * resets the password each time it's called.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const agency = await prisma.agency.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  // Owner + manager (Agency Admin) are the login-capable staff.
  const staff = await prisma.agencyUser.findMany({
    where: { agencyId: id, user: { role: { in: ["AGENCY_OWNER", "AGENCY_ADMIN"] } } },
    select: { user: { select: { id: true, email: true, fullName: true, role: true } } },
  });

  if (staff.length === 0) {
    return NextResponse.json(
      { error: "This agency has no owner/admin user to provision a login for." },
      { status: 400 }
    );
  }

  const credentials = [];
  for (const s of staff) {
    // Ensure the app user is active so they can authenticate.
    await prisma.user.update({ where: { id: s.user.id }, data: { isActive: true } });
    const result = await provisionLogin({
      userId: s.user.id,
      email: s.user.email,
      fullName: s.user.fullName,
      role: s.user.role,
    });
    credentials.push(result);
  }

  const anySuccess = credentials.some((c) => c.password);
  await logAudit({
    userId: user.id,
    action: "PROVISION_AGENCY_LOGIN",
    resource: "agency",
    resourceId: id,
    newValue: { emails: credentials.map((c) => c.email), success: anySuccess },
  });

  if (!anySuccess) {
    return NextResponse.json(
      { error: credentials[0]?.error ?? "Could not provision login credentials.", credentials },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, credentials });
}
