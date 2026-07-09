import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  collegeName: z.string().min(3),
  website: z.string().url().optional().or(z.literal("")),
  officialEmail: z.string().email(),
  contactPersonName: z.string().min(2),
  contactPersonDesig: z.string().min(2),
  mobileNumber: z.string().min(10).max(15),
  country: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().optional(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) + "-" + Date.now().toString(36);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Check if email already exists
    const existing = await prisma.college.findFirst({
      where: { officialEmail: data.officialEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "A college with this email is already registered." }, { status: 409 });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // Create Supabase auth user
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.officialEmail,
      phone: data.mobileNumber.startsWith("+") ? data.mobileNumber : `+${data.mobileNumber}`,
      email_confirm: false,
      user_metadata: { role: "COLLEGE_ADMIN", full_name: data.contactPersonName },
    });

    let supabaseId: string;
    if (authError || !authData.user) {
      // If supabase admin user creation fails (e.g., no service role key), use placeholder
      supabaseId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } else {
      supabaseId = authData.user.id;
    }

    // Create college and user in a transaction
    const college = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseId,
          email: data.officialEmail,
          phone: data.mobileNumber,
          fullName: data.contactPersonName,
          role: "COLLEGE_ADMIN",
          isActive: false, // Activated after admin approval
        },
      });

      const college = await tx.college.create({
        data: {
          adminId: user.id,
          name: data.collegeName,
          slug: generateSlug(data.collegeName),
          officialEmail: data.officialEmail,
          contactPhone: data.mobileNumber,
          contactPersonName: data.contactPersonName,
          contactPersonDesig: data.contactPersonDesig,
          website: data.website || null,
          address: data.address,
          city: data.city,
          state: data.state || null,
          country: data.country,
          status: "PENDING",
          isVerified: false,
          verificationToken: otp,
          verificationExpiry: expiry,
        },
      });

      // Link user to college via CollegeUser
      await tx.collegeUser.create({
        data: {
          collegeId: college.id,
          userId: user.id,
          designation: data.contactPersonDesig,
        },
      });

      return college;
    });

    // Notify Super Admins
    const superAdmins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" } });
    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          userId: admin.id,
          type: "INFO",
          title: "New College Registration",
          message: `${data.collegeName} has registered and is awaiting approval.`,
          resourceId: college.id,
        })),
        skipDuplicates: true,
      });
    }

    // In production, send the OTP email here via your email provider
    // For now, include it in dev response only
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json({
      collegeId: college.id,
      message: "Registration submitted. Please verify your email.",
      ...(isDev && { devOtp: otp }),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("College registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
