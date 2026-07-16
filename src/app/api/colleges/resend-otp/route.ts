import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { collegeId } = await request.json();
    if (!collegeId) return NextResponse.json({ error: "collegeId required" }, { status: 400 });

    const college = await prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

    if (college.emailVerified) {
      return NextResponse.json({ message: "Already verified" });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.college.update({
      where: { id: collegeId },
      data: { verificationToken: otp, verificationExpiry: expiry },
    });

    const emailResult = await sendOtpEmail(
      college.officialEmail,
      otp,
      "College email verification"
    );

    if (!emailResult.sent) {
      console.error("[resend-otp] College email failed:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Check SMTP configuration." },
        { status: 500 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({ success: true, ...(isDev && { devOtp: otp }) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to resend OTP" }, { status: 500 });
  }
}
