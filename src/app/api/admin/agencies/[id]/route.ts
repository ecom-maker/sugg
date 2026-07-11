import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
  registrationNumber: z.string().max(120).optional().nullable(),
  ownerName: z.string().max(200).optional().nullable(),
  ownerMobile: z.string().max(40).optional().nullable(),
  nationalIdType: z.string().max(60).optional().nullable(),
  nationalIdNumber: z.string().max(120).optional().nullable(),
  headquarters: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  countryId: z.string().optional().nullable(),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
});

/**
 * GET /api/admin/agencies/[id] — agency detail (Super Admin).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      suggBranch: { select: { id: true, branchName: true } },
      geoCountry: { select: { countryName: true } },
      geoState: { select: { stateName: true } },
      geoDistrict: { select: { districtName: true } },
      _count: { select: { branches: true, agencyUsers: true, commissions: true } },
    },
  });
  if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  return NextResponse.json({ agency });
}

/**
 * PUT /api/admin/agencies/[id] — edit agency details (Super Admin, audited).
 * Note: changing geography here does NOT auto-remap the covering Sugg Branch —
 * mapping is a separate, explicit action (PUT .../sugg-branch).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const data = updateSchema.parse(await request.json());

    const existing = await prisma.agency.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!existing) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    if (data.email && data.email !== existing.email) {
      const dupe = await prisma.agency.findFirst({ where: { email: data.email, id: { not: id } }, select: { id: true } });
      if (dupe) return NextResponse.json({ error: "Another agency already uses this email" }, { status: 409 });
    }

    const agency = await prisma.$transaction(async (tx) => {
      const updated = await tx.agency.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.website !== undefined ? { website: data.website || null } : {}),
          ...(data.registrationNumber !== undefined ? { registrationNumber: data.registrationNumber || null } : {}),
          ...(data.ownerName !== undefined ? { ownerName: data.ownerName || null } : {}),
          ...(data.ownerMobile !== undefined ? { ownerMobile: data.ownerMobile || null } : {}),
          ...(data.nationalIdType !== undefined ? { nationalIdType: data.nationalIdType || null } : {}),
          ...(data.nationalIdNumber !== undefined ? { nationalIdNumber: data.nationalIdNumber || null } : {}),
          ...(data.headquarters !== undefined ? { headquarters: data.headquarters || null } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.city !== undefined ? { city: data.city || null } : {}),
          ...(data.countryId !== undefined ? { countryId: data.countryId || null } : {}),
          ...(data.stateId !== undefined ? { stateId: data.stateId || null } : {}),
          ...(data.districtId !== undefined ? { districtId: data.districtId || null } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.approvalStatus !== undefined ? { approvalStatus: data.approvalStatus } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_AGENCY",
          resource: "agency",
          resourceId: id,
          newValue: {
            name: updated.name,
            approvalStatus: updated.approvalStatus,
            isActive: updated.isActive,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[PUT /api/admin/agencies/[id]]", err);
    return NextResponse.json({ error: "Failed to update agency" }, { status: 500 });
  }
}
