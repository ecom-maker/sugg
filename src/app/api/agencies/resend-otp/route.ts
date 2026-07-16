import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** POST /api/agencies/resend-otp  { agencyId } — regenerate the OTP. */
export async function POST(request: NextRequest) {
  try {
    const { agencyId } = await request.json();
    if (!agencyId) return NextResponse.json({ error: "agencyId required" }, { status: 400 });

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    if (agency.isVerified) return NextResponse.json({ message: "Already verified" });

    const otp = generateOTP();
    await prisma.agency.update({
      where: { id: agencyId },
      data: { verificationToken: otp, verificationExpiry: new Date(Date.now() + 30 * 60 * 1000) },
    });

    const recipient = agency.ownerEmail ?? agency.email;
    const emailResult = await sendOtpEmail(recipient, otp, "Agency email verification");

    if (!emailResult.sent) {
      console.error("[resend-otp] Agency email failed:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Check SMTP configuration." },
        { status: 500 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({ success: true, ...(isDev && { devOtp: otp }) });
  } catch (err) {
    console.error("Agency resend-otp error:", err);
    return NextResponse.json({ error: "Failed to resend code" }, { status: 500 });
  }
}
