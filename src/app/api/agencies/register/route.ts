import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeMobileE164 } from "@/lib/mobile-normalize";
import { sendOtpEmail } from "@/lib/email";

const specialization = z.enum([
  "DOMESTIC_ADMISSIONS",
  "STUDY_ABROAD",
  "MEDICAL",
  "ENGINEERING",
  "MANAGEMENT",
  "OTHER",
]);

const schema = z.object({
  // Agency
  name: z.string().min(2).max(200),
  registrationNumber: z.string().min(1, "Registration/Trade License number is required"),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().min(3),
  city: z.string().min(1),
  countryId: z.string().min(1, "Country is required"),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  yearEstablished: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  counselorCountEstimate: z.coerce.number().int().min(0).max(100000).optional(),
  specialization: z.array(specialization).optional().default([]),
  // Owner (login identity)
  ownerName: z.string().min(2),
  ownerPhone: z.string().min(7),
  ownerEmail: z.string().email(),
  // Manager (optional — pre-creates an Agency Admin)
  managerName: z.string().optional(),
  managerPhone: z.string().optional(),
  managerEmail: z.string().email().optional().or(z.literal("")),
});

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) +
    "-" +
    Date.now().toString(36)
  );
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createSupabaseUser(email: string, phone: string, fullName: string, role: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    phone: phone.startsWith("+") ? phone : `+${phone}`,
    email_confirm: false,
    user_metadata: { role, full_name: fullName },
  });
  if (error || !data.user) {
    return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return data.user.id;
}

export async function POST(request: NextRequest) {
  try {
    const data = schema.parse(await request.json());

    // Duplicate checks: agency email, registration number, owner login email.
    const dupeAgency = await prisma.agency.findFirst({
      where: {
        OR: [{ email: data.email }, { registrationNumber: data.registrationNumber }],
      },
      select: { email: true, registrationNumber: true },
    });
    if (dupeAgency) {
      const field = dupeAgency.email === data.email ? "email" : "registration number";
      return NextResponse.json(
        { error: `An agency with this ${field} is already registered.` },
        { status: 409 }
      );
    }
    const dupeUser = await prisma.user.findFirst({
      where: { email: { in: [data.ownerEmail, ...(data.managerEmail ? [data.managerEmail] : [])] } },
      select: { email: true },
    });
    if (dupeUser) {
      return NextResponse.json(
        { error: `A user with the email ${dupeUser.email} already exists.` },
        { status: 409 }
      );
    }

    // Resolve geo names for the string columns (kept consistent with FKs).
    const [countryRec, stateRec] = await Promise.all([
      prisma.country.findUnique({ where: { id: data.countryId }, select: { countryName: true } }),
      data.stateId
        ? prisma.state.findUnique({ where: { id: data.stateId }, select: { stateName: true } })
        : Promise.resolve(null),
    ]);
    if (!countryRec) {
      return NextResponse.json({ error: "Selected country is invalid" }, { status: 400 });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);
    const hasManager = Boolean(data.managerEmail && data.managerName);

    const ownerSupabaseId = await createSupabaseUser(
      data.ownerEmail,
      data.ownerPhone,
      data.ownerName,
      "AGENCY_OWNER"
    );
    const managerSupabaseId = hasManager
      ? await createSupabaseUser(data.managerEmail!, data.managerPhone ?? "", data.managerName!, "AGENCY_ADMIN")
      : null;

    const agency = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          supabaseId: ownerSupabaseId,
          email: data.ownerEmail,
          phone: `+${normalizeMobileE164(data.ownerPhone)}`,
          fullName: data.ownerName,
          role: "AGENCY_OWNER",
          isActive: false, // activated on approval
        },
      });

      const agency = await tx.agency.create({
        data: {
          ownerId: owner.id,
          name: data.name,
          slug: generateSlug(data.name),
          registrationNumber: data.registrationNumber,
          email: data.email,
          phone: data.phone,
          website: data.website || null,
          address: data.address,
          city: data.city,
          state: stateRec?.stateName ?? null,
          country: countryRec.countryName,
          countryId: data.countryId,
          stateId: data.stateId || null,
          districtId: data.districtId || null,
          yearEstablished: data.yearEstablished ?? null,
          counselorCountEstimate: data.counselorCountEstimate ?? null,
          specialization: data.specialization,
          ownerName: data.ownerName,
          ownerMobile: data.ownerPhone,
          ownerEmail: data.ownerEmail,
          managerName: hasManager ? data.managerName : null,
          managerPhone: hasManager ? data.managerPhone ?? null : null,
          managerEmail: hasManager ? data.managerEmail : null,
          approvalStatus: "PENDING",
          onboardingSource: "SELF_REGISTERED",
          isVerified: false,
          emailVerified: false,
          mobileVerified: false,
          verificationToken: otp,
          verificationExpiry: expiry,
        },
      });

      await tx.agencyUser.create({
        data: { userId: owner.id, agencyId: agency.id, branchId: null, status: "PENDING" },
      });

      if (hasManager) {
        const manager = await tx.user.create({
          data: {
            supabaseId: managerSupabaseId!,
            email: data.managerEmail!,
            phone: data.managerPhone ? `+${normalizeMobileE164(data.managerPhone)}` : null,
            fullName: data.managerName!,
            role: "AGENCY_ADMIN",
            isActive: false,
          },
        });
        await tx.agencyUser.create({
          data: { userId: manager.id, agencyId: agency.id, branchId: null, status: "PENDING" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: null,
          action: "REGISTER_AGENCY",
          resource: "agency",
          resourceId: agency.id,
          newValue: { name: agency.name, onboardingSource: "SELF_REGISTERED" },
        },
      });

      return agency;
    });

    // Notify Super Admins.
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    });
    if (superAdmins.length) {
      await prisma.notification.createMany({
        data: superAdmins.map((a) => ({
          userId: a.id,
          type: "NEW_AGENCY_REGISTRATION" as const,
          title: "New Agency Registration",
          message: `${data.name} has registered and is awaiting approval.`,
          resourceId: agency.id,
        })),
        skipDuplicates: true,
      });
    }

    const emailResult = await sendOtpEmail(
      data.ownerEmail,
      otp,
      "Agency registration verification"
    );

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({
      agencyId: agency.id,
      message: emailResult.sent
        ? "Registration submitted. Please check your email for the verification code."
        : "Registration submitted. Please use Resend OTP if you did not receive the code.",
      ...(isDev && { devOtp: otp }),
      ...(!emailResult.sent && isDev && { emailError: emailResult.error }),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Agency registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
