import { PrismaClient, type LeadStatus, type UserRole } from "@prisma/client";

type Geo = Record<string, { countryId: string; stateId: string; districtId: string }>;

/**
 * Seeds the Agency Onboarding demo data:
 *  - Global Pathway Consultants (APPROVED, self-registered) with owner + manager,
 *    Head Office + Kochi branch, 2 teams, 4 counselors, 6 leads + status history.
 *  - Horizon Study Abroad (PENDING, awaiting approval).
 *  - QuickAdmit Services (REJECTED, with reason).
 * Idempotent (upserts / fixed ids).
 */
export async function seedAgencyOnboarding(prisma: PrismaClient, geo: Geo) {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  const kochi = geo["IN:Kerala:Ernakulam"];
  const chennai = geo["IN:Tamil Nadu:Chennai"];
  if (!kochi) {
    console.log("⚠️  Skipping agency onboarding seed — Kerala/Ernakulam geo not found");
    return;
  }

  const upsertUser = (email: string, fullName: string, role: UserRole, isActive: boolean, phone?: string) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { supabaseId: `seed-${email}`, email, fullName, role, isActive, phone: phone ?? null },
    });

  // ── Global Pathway Consultants (APPROVED) ──────────────────────────────────
  const owner = await upsertUser("owner@globalpathway.in", "Nikhil Menon", "AGENCY_OWNER", true, "+919847010456");
  const manager = await upsertUser("manager@globalpathway.in", "Anjali Pillai", "AGENCY_ADMIN", true, "+919847020456");
  const counselors = [];
  for (let i = 1; i <= 4; i++) {
    counselors.push(
      await upsertUser(`counselor${i}@globalpathway.in`, `GP Counselor ${i}`, "AGENCY_COUNSELOR", true, `+91984703040${i}`)
    );
  }

  const gp = await prisma.agency.upsert({
    where: { slug: "global-pathway-consultants" },
    update: {},
    create: {
      ownerId: owner.id,
      name: "Global Pathway Consultants",
      slug: "global-pathway-consultants",
      registrationNumber: "GPC-2019-0456",
      email: "info@globalpathway.in",
      phone: "+91 484 291 0456",
      website: "https://globalpathway.in",
      address: "MG Road, Kochi",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      countryId: kochi.countryId,
      stateId: kochi.stateId,
      districtId: kochi.districtId,
      yearEstablished: 2019,
      counselorCountEstimate: 6,
      specialization: ["STUDY_ABROAD", "MANAGEMENT"],
      ownerName: "Nikhil Menon",
      ownerMobile: "+919847010456",
      ownerEmail: "owner@globalpathway.in",
      managerName: "Anjali Pillai",
      managerPhone: "+919847020456",
      managerEmail: "manager@globalpathway.in",
      approvalStatus: "APPROVED",
      onboardingSource: "SELF_REGISTERED",
      isVerified: true,
      emailVerified: true,
      mobileVerified: true,
      approvedById: admin?.id ?? null,
      approvedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.agencyUser.upsert({
    where: { userId: owner.id },
    update: {},
    create: { userId: owner.id, agencyId: gp.id, status: "ACTIVE" },
  });
  await prisma.agencyUser.upsert({
    where: { userId: manager.id },
    update: {},
    create: { userId: manager.id, agencyId: gp.id, status: "ACTIVE" },
  });

  const headOffice = await prisma.agencyBranch.upsert({
    where: { branchCode: "GP-HO" },
    update: {},
    create: {
      agencyId: gp.id,
      branchName: "Head Office",
      branchCode: "GP-HO",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      countryId: kochi.countryId,
      stateId: kochi.stateId,
      districtId: kochi.districtId,
      status: "ACTIVE",
    },
  });
  const kochiBranch = await prisma.agencyBranch.upsert({
    where: { branchCode: "GP-KOC-01" },
    update: {},
    create: {
      agencyId: gp.id,
      branchName: "Kochi City Branch",
      branchCode: "GP-KOC-01",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      countryId: kochi.countryId,
      stateId: kochi.stateId,
      districtId: kochi.districtId,
      status: "ACTIVE",
    },
  });

  // Counselor agency-user memberships (2 per branch).
  const counselorAUs = [];
  for (let i = 0; i < counselors.length; i++) {
    const branchId = i < 2 ? headOffice.id : kochiBranch.id;
    const au = await prisma.agencyUser.upsert({
      where: { userId: counselors[i].id },
      update: {},
      create: { userId: counselors[i].id, agencyId: gp.id, branchId, status: "ACTIVE" },
    });
    counselorAUs.push({ user: counselors[i], au, branchId });
  }

  // Two teams (one per branch).
  const teamDefs = [
    { id: "seed-gp-team-1", name: "Head Office Team", branchId: headOffice.id, members: [0, 1] },
    { id: "seed-gp-team-2", name: "Kochi City Team", branchId: kochiBranch.id, members: [2, 3] },
  ];
  for (const t of teamDefs) {
    await prisma.team.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        teamName: t.name,
        districtId: kochi.districtId,
        branchId: t.branchId,
        teamLeadId: counselorAUs[t.members[0]].au.id,
        createdById: owner.id,
        status: "ACTIVE",
      },
    });
    for (const m of t.members) {
      await prisma.teamMember.upsert({
        where: { teamId_counselorId: { teamId: t.id, counselorId: counselorAUs[m].au.id } },
        update: {},
        create: { teamId: t.id, counselorId: counselorAUs[m].au.id, status: "ACTIVE" },
      });
    }
  }

  // Six leads across the pipeline, with status history.
  const statuses: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "APPLICATION_SUBMITTED",
    "ADMISSION_CONFIRMED",
    "LOST",
  ];
  for (let i = 0; i < 6; i++) {
    const c = counselorAUs[i % counselorAUs.length];
    const mobile = `+9198471100${i}`;
    const student = await prisma.student.upsert({
      where: { mobile },
      update: {},
      create: {
        name: `GP Student ${i + 1}`,
        mobile,
        mobileNumberNormalized: `9198471100${i}`,
        email: `student${i + 1}@example.com`,
        city: "Kochi",
        country: "India",
        interestedCourse: i % 2 === 0 ? "MBA" : "MS Computer Science",
        source: "AGENCY_REFERRAL",
        agencyId: gp.id,
        branchId: c.branchId,
      },
    });

    const leadId = `seed-gp-lead-${i}`;
    await prisma.lead.upsert({
      where: { id: leadId },
      update: {},
      create: {
        id: leadId,
        studentId: student.id,
        source: "AGENCY_REFERRAL",
        status: statuses[i],
        score: 30 + i * 12,
        assignedToId: c.user.id,
        branchId: c.branchId,
        assignmentRule: "MANUAL",
        isCurrent: true,
        lastContactedAt: i > 0 ? new Date() : null,
        lostReason: statuses[i] === "LOST" ? "Chose a competitor" : null,
      },
    });

    await prisma.studentReferral.upsert({
      where: { studentId: student.id },
      update: {},
      create: { agencyId: gp.id, studentId: student.id, referredById: c.user.id },
    });

    // Status history: initial NEW, then the current status if different.
    await prisma.leadStatusHistory.upsert({
      where: { id: `seed-gp-lsh-${i}-0` },
      update: {},
      create: { id: `seed-gp-lsh-${i}-0`, leadId, fromStatus: null, toStatus: "NEW", changedById: c.user.id },
    });
    if (statuses[i] !== "NEW") {
      await prisma.leadStatusHistory.upsert({
        where: { id: `seed-gp-lsh-${i}-1` },
        update: {},
        create: {
          id: `seed-gp-lsh-${i}-1`,
          leadId,
          fromStatus: "NEW",
          toStatus: statuses[i],
          changedById: c.user.id,
        },
      });
    }
  }

  // ── Horizon Study Abroad (PENDING) ─────────────────────────────────────────
  const pendingOwner = await upsertUser("owner@horizonstudy.in", "Rahul Verma", "AGENCY_OWNER", false, "+919000010001");
  const pending = await prisma.agency.upsert({
    where: { slug: "horizon-study-abroad" },
    update: {},
    create: {
      ownerId: pendingOwner.id,
      name: "Horizon Study Abroad",
      slug: "horizon-study-abroad",
      registrationNumber: "HSA-2023-0012",
      email: "info@horizonstudy.in",
      phone: "+91 44 2100 0012",
      address: "Anna Salai, Chennai",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      countryId: chennai?.countryId,
      stateId: chennai?.stateId,
      districtId: chennai?.districtId,
      yearEstablished: 2023,
      specialization: ["STUDY_ABROAD"],
      ownerName: "Rahul Verma",
      ownerMobile: "+919000010001",
      ownerEmail: "owner@horizonstudy.in",
      approvalStatus: "PENDING",
      onboardingSource: "SELF_REGISTERED",
      isVerified: true,
      emailVerified: true,
      mobileVerified: true,
      isActive: false,
    },
  });
  await prisma.agencyUser.upsert({
    where: { userId: pendingOwner.id },
    update: {},
    create: { userId: pendingOwner.id, agencyId: pending.id, status: "PENDING" },
  });

  // ── QuickAdmit Services (REJECTED) ─────────────────────────────────────────
  const rejOwner = await upsertUser("owner@quickadmit.in", "Suresh Iyer", "AGENCY_OWNER", false, "+919000020002");
  const rejected = await prisma.agency.upsert({
    where: { slug: "quickadmit-services" },
    update: {},
    create: {
      ownerId: rejOwner.id,
      name: "QuickAdmit Services",
      slug: "quickadmit-services",
      registrationNumber: "QAS-2024-9911",
      email: "info@quickadmit.in",
      phone: "+91 80 4400 9911",
      address: "Brigade Road, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      specialization: ["OTHER"],
      ownerName: "Suresh Iyer",
      ownerMobile: "+919000020002",
      ownerEmail: "owner@quickadmit.in",
      approvalStatus: "REJECTED",
      onboardingSource: "SELF_REGISTERED",
      rejectionReason: "Registration number could not be verified.",
      isVerified: true,
      emailVerified: true,
      mobileVerified: true,
      isActive: false,
    },
  });
  await prisma.agencyUser.upsert({
    where: { userId: rejOwner.id },
    update: {},
    create: { userId: rejOwner.id, agencyId: rejected.id, status: "PENDING" },
  });

  console.log("✅ Agency onboarding seed: Global Pathway (APPROVED), Horizon (PENDING), QuickAdmit (REJECTED)");
}
