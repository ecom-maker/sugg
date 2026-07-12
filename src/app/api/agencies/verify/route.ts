import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/agencies/verify  { agencyId, token }
 * Verifies the owner's OTP. On success marks the agency VERIFIED (email +
 * mobile). Approval by a Super Admin is still required before login.
 */
export async function POST(request: NextRequest) {
  try {
    const { agencyId, token } = await request.json();
    if (!agencyId || !token) {
      return NextResponse.json({ error: "agencyId and token are required" }, { status: 400 });
    }

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    if (agency.isVerified) {
      return NextResponse.json({ message: "Already verified" });
    }
    if (!agency.verificationToken || agency.verificationToken !== token) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }
    if (agency.verificationExpiry && new Date(agency.verificationExpiry) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        emailVerified: true,
        mobileVerified: true,
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: "Verified successfully" });
  } catch (err) {
    console.error("Agency verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
