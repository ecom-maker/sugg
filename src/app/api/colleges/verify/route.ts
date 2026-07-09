import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { collegeId, token } = await request.json();
    if (!collegeId || !token) {
      return NextResponse.json({ error: "collegeId and token are required" }, { status: 400 });
    }

    const college = await prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });

    if (college.emailVerified) {
      return NextResponse.json({ message: "Already verified" });
    }

    if (!college.verificationToken || college.verificationToken !== token) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (college.verificationExpiry && new Date(college.verificationExpiry) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    await prisma.college.update({
      where: { id: collegeId },
      data: {
        emailVerified: true,
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
