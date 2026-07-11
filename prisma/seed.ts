import { PrismaClient } from "@prisma/client";
import { seedGeo } from "./seed-geo";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ────────────────────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: "super_admin" },
      update: {},
      create: {
        name: "super_admin",
        description: "Full platform access",
      },
    }),
    prisma.role.upsert({
      where: { name: "sugg_counselor" },
      update: {},
      create: {
        name: "sugg_counselor",
        description: "Admission counselor at Sugg",
      },
    }),
    prisma.role.upsert({
      where: { name: "college_admin" },
      update: {},
      create: {
        name: "college_admin",
        description: "College administrator",
      },
    }),
    prisma.role.upsert({
      where: { name: "agency_admin" },
      update: {},
      create: {
        name: "agency_admin",
        description: "Agency administrator",
      },
    }),
  ]);

  console.log("✅ Roles created");

  // ─── Demo Users ───────────────────────────────────────────────────────────
  // ⚠️  REPLACE these emails with your real emails before running seed
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@sugg.in";
  const COUNSELOR1_EMAIL = process.env.SEED_COUNSELOR1_EMAIL ?? "counselor1@sugg.in";
  const COUNSELOR2_EMAIL = process.env.SEED_COUNSELOR2_EMAIL ?? "counselor2@sugg.in";

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      supabaseId: `admin-${Date.now()}`,
      email: ADMIN_EMAIL,
      fullName: "Sugg Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const counselor1 = await prisma.user.upsert({
    where: { email: COUNSELOR1_EMAIL },
    update: {},
    create: {
      supabaseId: `counselor1-${Date.now()}`,
      email: COUNSELOR1_EMAIL,
      fullName: "Rahul Kumar",
      role: "SUGG_COUNSELOR",
      isActive: true,
    },
  });

  const counselor2 = await prisma.user.upsert({
    where: { email: COUNSELOR2_EMAIL },
    update: {},
    create: {
      supabaseId: `counselor2-${Date.now()}`,
      email: COUNSELOR2_EMAIL,
      fullName: "Priya Sharma",
      role: "SUGG_COUNSELOR",
      isActive: true,
    },
  });

  console.log("✅ Users created");

  // ─── Counselor Profiles ───────────────────────────────────────────────────
  await prisma.counselor.upsert({
    where: { userId: counselor1.id },
    update: {},
    create: {
      userId: counselor1.id,
      specializations: ["mba", "bba", "management"],
      maxLeads: 50,
      isAvailable: true,
    },
  });

  await prisma.counselor.upsert({
    where: { userId: counselor2.id },
    update: {},
    create: {
      userId: counselor2.id,
      specializations: ["btech", "engineering", "computer science"],
      maxLeads: 50,
      isAvailable: true,
    },
  });

  console.log("✅ Counselor profiles created");

  // ─── Universities ─────────────────────────────────────────────────────────
  const iitUniversity = await prisma.university.upsert({
    where: { name: "Indian Institute of Technology" },
    update: {},
    create: {
      name: "Indian Institute of Technology",
      establishmentYear: 1958,
      location: "Powai, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      website: "https://www.iitb.ac.in",
      universityType: "PUBLIC",
      accreditation: "Institute of National Importance",
      description: "Premier group of autonomous public technical universities in India.",
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  const iimUniversity = await prisma.university.upsert({
    where: { name: "Indian Institute of Management" },
    update: {},
    create: {
      name: "Indian Institute of Management",
      establishmentYear: 1961,
      location: "Vastrapur, Ahmedabad",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      website: "https://www.iima.ac.in",
      universityType: "PUBLIC",
      accreditation: "AACSB, EQUIS, AMBA",
      description: "Leading management education institutions in India.",
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  const christUniversity = await prisma.university.upsert({
    where: { name: "Christ University" },
    update: {},
    create: {
      name: "Christ University",
      establishmentYear: 1969,
      location: "Hosur Road, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      website: "https://christuniversity.in",
      universityType: "DEEMED",
      accreditation: "NAAC A+",
      description: "Deemed to be university offering diverse undergraduate and postgraduate programmes.",
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  const abcUniEntity = await prisma.university.upsert({
    where: { name: "ABC University Group" },
    update: {},
    create: {
      name: "ABC University Group",
      establishmentYear: 1985,
      location: "Sector 10, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      website: "https://abcuniversity.edu",
      universityType: "PRIVATE",
      accreditation: "NAAC A++, UGC",
      description: "Private university group with campuses across India.",
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  const dubaiUniversity = await prisma.university.upsert({
    where: { name: "University of Dubai" },
    update: {},
    create: {
      name: "University of Dubai",
      establishmentYear: 2006,
      location: "Academic City, Dubai",
      city: "Dubai",
      country: "UAE",
      website: "https://www.ud.ac.ae",
      universityType: "INTERNATIONAL",
      accreditation: "CAA UAE",
      description: "International university serving students across the Middle East and Asia.",
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  console.log("✅ Universities created");

  // ─── Colleges ─────────────────────────────────────────────────────────────
  const college1 = await prisma.college.upsert({
    where: { slug: "iim-ahmedabad" },
    update: { universityId: iimUniversity.id },
    create: {
      universityId: iimUniversity.id,
      name: "IIM Ahmedabad",
      slug: "iim-ahmedabad",
      officialEmail: "admissions@iima.ac.in",
      website: "https://www.iima.ac.in",
      contactPhone: "+91 79 6632 4000",
      address: "Vastrapur, Ahmedabad",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      pincode: "380015",
      description: "Premier management institution of India",
      establishedYear: 1961,
      accreditation: ["AACSB", "EQUIS", "AMBA"],
      status: "APPROVED",
      isVerified: true,
      approvedAt: new Date(),
    },
  });

  const college2 = await prisma.college.upsert({
    where: { slug: "iit-bombay" },
    update: { universityId: iitUniversity.id },
    create: {
      universityId: iitUniversity.id,
      name: "IIT Bombay",
      slug: "iit-bombay",
      officialEmail: "admissions@iitb.ac.in",
      website: "https://www.iitb.ac.in",
      contactPhone: "+91 22 2576 7042",
      address: "Powai, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400076",
      description: "India's premier engineering institution",
      establishedYear: 1958,
      accreditation: ["NAAC A++", "NIRF Top 3"],
      status: "APPROVED",
      isVerified: true,
      approvedAt: new Date(),
    },
  });

  const college3 = await prisma.college.upsert({
    where: { slug: "christ-university" },
    update: { universityId: christUniversity.id },
    create: {
      universityId: christUniversity.id,
      name: "Christ University",
      slug: "christ-university",
      officialEmail: "admissions@christuniversity.in",
      website: "https://christuniversity.in",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      description: "Deemed to be University, Bangalore",
      establishedYear: 1969,
      accreditation: ["NAAC A+"],
      status: "PENDING",
      isVerified: false,
    },
  });

  console.log("✅ Colleges created");

  // ─── Courses ──────────────────────────────────────────────────────────────
  await prisma.course.createMany({
    skipDuplicates: true,
    data: [
      {
        collegeId: college1.id,
        name: "MBA",
        degreeType: "MASTER",
        duration: "2 years",
        durationMonths: 24,
        eligibility: "Bachelor's degree with 50%+ marks",
        totalSeats: 385,
        availableSeats: 50,
        annualFee: 1100000,
        totalFee: 2200000,
        description: "The flagship 2-year MBA program",
      },
      {
        collegeId: college1.id,
        name: "Executive MBA",
        degreeType: "MASTER",
        duration: "1 year",
        durationMonths: 12,
        eligibility: "5+ years work experience",
        totalSeats: 72,
        availableSeats: 20,
        annualFee: 2900000,
        totalFee: 2900000,
        description: "For experienced professionals",
      },
      {
        collegeId: college2.id,
        name: "B.Tech Computer Science",
        degreeType: "BACHELOR",
        duration: "4 years",
        durationMonths: 48,
        eligibility: "JEE Advanced qualifiers",
        totalSeats: 100,
        availableSeats: 0,
        annualFee: 250000,
        totalFee: 1000000,
      },
      {
        collegeId: college2.id,
        name: "M.Tech Artificial Intelligence",
        degreeType: "MASTER",
        duration: "2 years",
        durationMonths: 24,
        eligibility: "B.Tech/BE with GATE score",
        totalSeats: 30,
        availableSeats: 10,
        annualFee: 175000,
        totalFee: 350000,
      },
    ],
  });

  console.log("✅ Courses created");

  // ─── College Admin User ───────────────────────────────────────────────────
  const COLLEGE_ADMIN_EMAIL = process.env.SEED_COLLEGE_ADMIN_EMAIL ?? "admissions@abcuniversity.com";

  const collegeAdminUser = await prisma.user.upsert({
    where: { email: COLLEGE_ADMIN_EMAIL },
    update: {},
    create: {
      supabaseId: `college-admin-${Date.now()}`,
      email: COLLEGE_ADMIN_EMAIL,
      fullName: "Dr. Anita Sharma",
      role: "COLLEGE_ADMIN",
      isActive: true,
    },
  });

  const abcUniversity = await prisma.college.upsert({
    where: { slug: "abc-university" },
    update: { universityId: abcUniEntity.id },
    create: {
      universityId: abcUniEntity.id,
      adminId: collegeAdminUser.id,
      name: "ABC University",
      slug: "abc-university",
      officialEmail: COLLEGE_ADMIN_EMAIL,
      contactPhone: "+91 80 1234 5678",
      contactPersonName: "Dr. Anita Sharma",
      contactPersonDesig: "Head of Admissions",
      website: "https://abcuniversity.edu",
      address: "123 University Road, Sector 10",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      pincode: "560001",
      description: "A premier institution offering world-class education since 1985.",
      establishedYear: 1985,
      accreditation: ["NAAC A++", "UGC"],
      status: "APPROVED",
      isVerified: true,
      emailVerified: true,
      approvedAt: new Date(),
    },
  });

  // Link college admin to college_users
  await prisma.collegeUser.upsert({
    where: { userId: collegeAdminUser.id },
    update: {},
    create: {
      collegeId: abcUniversity.id,
      userId: collegeAdminUser.id,
      designation: "Head of Admissions",
    },
  });

  // Add courses to ABC University
  const mbaId = `abc-mba-${Date.now()}`;
  const btechId = `abc-btech-${Date.now()}`;

  await prisma.course.upsert({
    where: { id: mbaId },
    update: {},
    create: {
      id: mbaId,
      collegeId: abcUniversity.id,
      name: "Master of Business Administration (MBA)",
      degreeType: "MASTER",
      duration: "2 years",
      durationMonths: 24,
      eligibility: "Graduate in any discipline with minimum 50% marks",
      totalSeats: 120,
      availableSeats: 40,
      annualFee: 350000,
      totalFee: 700000,
      description: "A flagship MBA programme with specialisations in Finance, Marketing, and HR.",
      isActive: true,
    },
  });

  await prisma.course.upsert({
    where: { id: btechId },
    update: {},
    create: {
      id: btechId,
      collegeId: abcUniversity.id,
      name: "Bachelor of Technology (Computer Science)",
      degreeType: "BACHELOR",
      duration: "4 years",
      durationMonths: 48,
      eligibility: "10+2 with Physics, Chemistry, Mathematics (min. 60%)",
      totalSeats: 180,
      availableSeats: 60,
      annualFee: 180000,
      totalFee: 720000,
      description: "B.Tech CS with AI/ML, Cloud, and Cybersecurity tracks.",
      isActive: true,
    },
  });

  console.log("✅ ABC University with College Admin, MBA & B.Tech courses created");

  // ─── Agency Users ─────────────────────────────────────────────────────────
  const AGENCY_OWNER_EMAIL = process.env.SEED_AGENCY_OWNER_EMAIL ?? "owner@eduvision.in";
  const AGENCY_ADMIN_EMAIL = process.env.SEED_AGENCY_ADMIN_EMAIL ?? "admin@eduvision.in";
  const BRANCH_MANAGER1_EMAIL = "bm.delhi@eduvision.in";
  const BRANCH_MANAGER2_EMAIL = "bm.mumbai@eduvision.in";
  const COUNSELOR_A1_EMAIL = "counselor.delhi1@eduvision.in";
  const COUNSELOR_A2_EMAIL = "counselor.delhi2@eduvision.in";
  const COUNSELOR_B1_EMAIL = "counselor.mumbai1@eduvision.in";

  const agencyOwner = await prisma.user.upsert({
    where: { email: AGENCY_OWNER_EMAIL },
    update: {},
    create: {
      supabaseId: `agency-owner-${Date.now()}`,
      email: AGENCY_OWNER_EMAIL,
      fullName: "Ramesh Gupta",
      role: "AGENCY_OWNER",
      isActive: true,
    },
  });

  const agencyAdmin = await prisma.user.upsert({
    where: { email: AGENCY_ADMIN_EMAIL },
    update: {},
    create: {
      supabaseId: `agency-admin-${Date.now()}`,
      email: AGENCY_ADMIN_EMAIL,
      fullName: "Sunita Rao",
      role: "AGENCY_ADMIN",
      isActive: true,
    },
  });

  const branchManager1 = await prisma.user.upsert({
    where: { email: BRANCH_MANAGER1_EMAIL },
    update: {},
    create: {
      supabaseId: `bm-delhi-${Date.now()}`,
      email: BRANCH_MANAGER1_EMAIL,
      fullName: "Anil Sharma",
      role: "BRANCH_MANAGER",
      isActive: true,
    },
  });

  const branchManager2 = await prisma.user.upsert({
    where: { email: BRANCH_MANAGER2_EMAIL },
    update: {},
    create: {
      supabaseId: `bm-mumbai-${Date.now()}`,
      email: BRANCH_MANAGER2_EMAIL,
      fullName: "Meera Nair",
      role: "BRANCH_MANAGER",
      isActive: true,
    },
  });

  const agencyCounselor1 = await prisma.user.upsert({
    where: { email: COUNSELOR_A1_EMAIL },
    update: {},
    create: {
      supabaseId: `ac-delhi1-${Date.now()}`,
      email: COUNSELOR_A1_EMAIL,
      fullName: "Deepak Verma",
      role: "AGENCY_COUNSELOR",
      isActive: true,
    },
  });

  const agencyCounselor2 = await prisma.user.upsert({
    where: { email: COUNSELOR_A2_EMAIL },
    update: {},
    create: {
      supabaseId: `ac-delhi2-${Date.now()}`,
      email: COUNSELOR_A2_EMAIL,
      fullName: "Kavya Singh",
      role: "AGENCY_COUNSELOR",
      isActive: true,
    },
  });

  const agencyCounselor3 = await prisma.user.upsert({
    where: { email: COUNSELOR_B1_EMAIL },
    update: {},
    create: {
      supabaseId: `ac-mumbai1-${Date.now()}`,
      email: COUNSELOR_B1_EMAIL,
      fullName: "Rohit Kulkarni",
      role: "AGENCY_COUNSELOR",
      isActive: true,
    },
  });

  // ─── Agency ───────────────────────────────────────────────────────────────
  const agency1 = await prisma.agency.upsert({
    where: { slug: "eduvision-consultants" },
    update: {},
    create: {
      ownerId: agencyOwner.id,
      name: "EduVision Consultants",
      slug: "eduvision-consultants",
      email: "info@eduvision.in",
      phone: "+91 98765 43210",
      website: "https://eduvision.in",
      headquarters: "Delhi",
      city: "Delhi",
      country: "India",
      assignmentStrategy: "ROUND_ROBIN",
      isActive: true,
      isVerified: true,
    },
  });

  // ─── Geographic Reference Data ────────────────────────────────────────────
  const { geo } = await seedGeo(prisma);

  // ─── Branches ─────────────────────────────────────────────────────────────
  const delhiGeo = geo["IN:Delhi:New Delhi"];
  const mumbaiGeo = geo["IN:Maharashtra:Mumbai"];

  const branch1 = await prisma.agencyBranch.upsert({
    where: { branchCode: "EDU-DEL-01" },
    update: {
      countryId: delhiGeo?.countryId,
      stateId: delhiGeo?.stateId,
      districtId: delhiGeo?.districtId,
    },
    create: {
      agencyId: agency1.id,
      branchName: "Delhi Central Branch",
      branchCode: "EDU-DEL-01",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      countryId: delhiGeo?.countryId,
      stateId: delhiGeo?.stateId,
      districtId: delhiGeo?.districtId,
      phone: "+91 11 4000 1234",
      email: "delhi@eduvision.in",
      managerId: branchManager1.id,
      status: "ACTIVE",
    },
  });

  const branch2 = await prisma.agencyBranch.upsert({
    where: { branchCode: "EDU-MUM-01" },
    update: {
      countryId: mumbaiGeo?.countryId,
      stateId: mumbaiGeo?.stateId,
      districtId: mumbaiGeo?.districtId,
    },
    create: {
      agencyId: agency1.id,
      branchName: "Mumbai Branch",
      branchCode: "EDU-MUM-01",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      countryId: mumbaiGeo?.countryId,
      stateId: mumbaiGeo?.stateId,
      districtId: mumbaiGeo?.districtId,
      phone: "+91 22 4000 5678",
      email: "mumbai@eduvision.in",
      managerId: branchManager2.id,
      status: "ACTIVE",
    },
  });

  // ─── Branch Targets ───────────────────────────────────────────────────────
  const now = new Date();
  await prisma.branchTarget.upsert({
    where: { branchId_month_year: { branchId: branch1.id, month: now.getMonth() + 1, year: now.getFullYear() } },
    update: {},
    create: {
      branchId: branch1.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      leadTarget: 50,
      admissionTarget: 10,
      revenueTarget: 500000,
    },
  });

  await prisma.branchTarget.upsert({
    where: { branchId_month_year: { branchId: branch2.id, month: now.getMonth() + 1, year: now.getFullYear() } },
    update: {},
    create: {
      branchId: branch2.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      leadTarget: 40,
      admissionTarget: 8,
      revenueTarget: 400000,
    },
  });

  // ─── Agency User Memberships ───────────────────────────────────────────────
  for (const { userId, branchId } of [
    { userId: agencyOwner.id, branchId: null },
    { userId: agencyAdmin.id, branchId: null },
    { userId: branchManager1.id, branchId: branch1.id },
    { userId: branchManager2.id, branchId: branch2.id },
    { userId: agencyCounselor1.id, branchId: branch1.id },
    { userId: agencyCounselor2.id, branchId: branch1.id },
    { userId: agencyCounselor3.id, branchId: branch2.id },
  ]) {
    await prisma.agencyUser.upsert({
      where: { userId },
      update: { branchId },
      create: { userId, agencyId: agency1.id, branchId },
    });
  }

  console.log("✅ Agency, branches, and staff created");

  // ─── Sugg Branch Network ──────────────────────────────────────────────────
  const SUGG_KERALA_MGR_EMAIL =
    process.env.SEED_SUGG_KERALA_MANAGER_EMAIL ?? "kerala.manager@sugg.in";
  const SUGG_DUBAI_MGR_EMAIL =
    process.env.SEED_SUGG_DUBAI_MANAGER_EMAIL ?? "dubai.manager@sugg.in";

  const keralaManager = await prisma.user.upsert({
    where: { email: SUGG_KERALA_MGR_EMAIL },
    update: { role: "SUGG_BRANCH_MANAGER" },
    create: {
      supabaseId: `sugg-kerala-mgr-${Date.now()}`,
      email: SUGG_KERALA_MGR_EMAIL,
      fullName: "Anjali Menon",
      role: "SUGG_BRANCH_MANAGER",
      isActive: true,
    },
  });

  const dubaiManager = await prisma.user.upsert({
    where: { email: SUGG_DUBAI_MGR_EMAIL },
    update: { role: "SUGG_BRANCH_MANAGER" },
    create: {
      supabaseId: `sugg-dubai-mgr-${Date.now()}`,
      email: SUGG_DUBAI_MGR_EMAIL,
      fullName: "Omar Al Farsi",
      role: "SUGG_BRANCH_MANAGER",
      isActive: true,
    },
  });

  const keralaGeo = geo["IN:Kerala:Ernakulam"];
  const dubaiGeo = geo["AE:Dubai:Dubai City"];
  const chennaiGeo = geo["IN:Tamil Nadu:Chennai"];
  if (!keralaGeo || !dubaiGeo || !chennaiGeo) {
    throw new Error("Expected Kerala, Dubai and Tamil Nadu geo entries to be seeded");
  }

  const suggKerala = await prisma.suggBranch.upsert({
    where: { branchCode: "SUGG-KL" },
    update: { managerId: keralaManager.id },
    create: {
      branchName: "Sugg Kerala",
      branchCode: "SUGG-KL",
      address: "MG Road, Kochi, Kerala",
      countryId: keralaGeo.countryId,
      stateId: keralaGeo.stateId,
      phone: "+91 484 400 0100",
      email: "kerala@sugg.in",
      managerId: keralaManager.id,
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  const suggDubai = await prisma.suggBranch.upsert({
    where: { branchCode: "SUGG-AE" },
    update: { managerId: dubaiManager.id },
    create: {
      branchName: "Sugg Dubai",
      branchCode: "SUGG-AE",
      address: "Sheikh Zayed Road, Dubai",
      countryId: dubaiGeo.countryId,
      phone: "+971 4 400 0100",
      email: "dubai@sugg.in",
      managerId: dubaiManager.id,
      status: "ACTIVE",
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  // Territories: Sugg Kerala covers all of Kerala (state-level); Sugg Dubai
  // covers the whole UAE (country-level). Idempotent create-if-absent.
  async function ensureTerritory(
    suggBranchId: string,
    countryId: string,
    stateId: string | null,
    districtId: string | null
  ) {
    const existing = await prisma.suggBranchTerritory.findFirst({
      where: { suggBranchId, countryId, stateId, districtId },
    });
    if (!existing) {
      await prisma.suggBranchTerritory.create({
        data: { suggBranchId, countryId, stateId, districtId },
      });
    }
  }
  await ensureTerritory(suggKerala.id, keralaGeo.countryId, keralaGeo.stateId, null);
  await ensureTerritory(suggDubai.id, dubaiGeo.countryId, null, null);

  // Assign the two seeded Sugg counselors to branches (demonstrates
  // territory-aware Sugg-internal routing when the toggle is enabled).
  await prisma.counselor.update({
    where: { userId: counselor1.id },
    data: { suggBranchId: suggKerala.id },
  });
  await prisma.counselor.update({
    where: { userId: counselor2.id },
    data: { suggBranchId: suggDubai.id },
  });

  // Map the existing EduVision agency into Kerala (covered by Sugg Kerala).
  await prisma.agency.update({
    where: { id: agency1.id },
    data: {
      headquarters: "Kochi",
      city: "Kochi",
      state: "Kerala",
      countryId: keralaGeo.countryId,
      stateId: keralaGeo.stateId,
      districtId: keralaGeo.districtId,
      suggBranchId: suggKerala.id,
      approvalStatus: "APPROVED",
    },
  });

  // Demo agency covered by Sugg Dubai.
  await prisma.agency.upsert({
    where: { slug: "gulf-education-partners" },
    update: { suggBranchId: suggDubai.id },
    create: {
      name: "Gulf Education Partners",
      slug: "gulf-education-partners",
      email: "info@gulfedu.ae",
      phone: "+971 4 555 1234",
      city: "Dubai",
      country: "United Arab Emirates",
      countryId: dubaiGeo.countryId,
      stateId: dubaiGeo.stateId,
      districtId: dubaiGeo.districtId,
      suggBranchId: suggDubai.id,
      approvalStatus: "APPROVED",
      isActive: true,
      isVerified: true,
    },
  });

  // Demo agency in an UNCOVERED territory (Tamil Nadu) → unassigned queue.
  await prisma.agency.upsert({
    where: { slug: "chennai-career-consultants" },
    update: {},
    create: {
      name: "Chennai Career Consultants",
      slug: "chennai-career-consultants",
      email: "contact@chennaicareers.in",
      phone: "+91 44 4000 9876",
      city: "Chennai",
      country: "India",
      countryId: chennaiGeo.countryId,
      stateId: chennaiGeo.stateId,
      districtId: chennaiGeo.districtId,
      suggBranchId: null,
      approvalStatus: "PENDING",
      isActive: true,
    },
  });

  // Territory-aware lead assignment ships OFF by default.
  await prisma.platformSetting.upsert({
    where: { key: "territoryAwareLeadAssignment" },
    update: {},
    create: { key: "territoryAwareLeadAssignment", value: "false" },
  });

  console.log("✅ Sugg Branch Network seeded (Sugg Kerala + Sugg Dubai)");

  // ─── Sample Teams ─────────────────────────────────────────────────────────
  const au1 = await prisma.agencyUser.findUnique({ where: { userId: agencyCounselor1.id } });
  const au2 = await prisma.agencyUser.findUnique({ where: { userId: agencyCounselor2.id } });
  const au3 = await prisma.agencyUser.findUnique({ where: { userId: agencyCounselor3.id } });

  if (delhiGeo && au1 && au2) {
    await prisma.team.upsert({
      where: { id: "seed-team-delhi-alpha" },
      update: {},
      create: {
        id: "seed-team-delhi-alpha",
        teamName: "Delhi Alpha Team",
        districtId: delhiGeo.districtId,
        branchId: branch1.id,
        teamLeadId: au1.id,
        status: "ACTIVE",
        createdById: agencyAdmin.id,
        members: {
          create: [
            { counselorId: au1.id, status: "ACTIVE" },
            { counselorId: au2.id, status: "ACTIVE" },
          ],
        },
      },
    });
  }

  if (mumbaiGeo && au3) {
    await prisma.team.upsert({
      where: { id: "seed-team-mumbai-beta" },
      update: {},
      create: {
        id: "seed-team-mumbai-beta",
        teamName: "Mumbai Beta Team",
        districtId: mumbaiGeo.districtId,
        branchId: branch2.id,
        teamLeadId: au3.id,
        status: "ACTIVE",
        createdById: agencyAdmin.id,
        members: {
          create: [{ counselorId: au3.id, status: "ACTIVE" }],
        },
      },
    });
  }

  console.log("✅ Sample teams created");

  // ─── Students & Leads ─────────────────────────────────────────────────────
  const studentsData = [
    {
      name: "Arjun Mehta",
      mobile: "919876543001",
      email: "arjun@example.com",
      city: "Mumbai",
      country: "India",
      educationLevel: "Graduate",
      qualification: "B.Com",
      interestedCourse: "MBA",
      preferredCountry: "India",
      budget: 2500000,
      source: "WHATSAPP" as const,
    },
    {
      name: "Sneha Reddy",
      mobile: "919876543002",
      email: "sneha@example.com",
      city: "Hyderabad",
      country: "India",
      educationLevel: "Graduate",
      qualification: "B.Tech",
      interestedCourse: "M.Tech AI",
      preferredCountry: "India",
      budget: 500000,
      source: "WHATSAPP" as const,
    },
    {
      name: "Vikram Patel",
      mobile: "919876543003",
      email: "vikram@example.com",
      city: "Ahmedabad",
      country: "India",
      qualification: "BBA",
      interestedCourse: "MBA",
      budget: 2000000,
      source: "AGENCY_REFERRAL" as const,
    },
    {
      name: "Kavya Nair",
      mobile: "919876543004",
      city: "Kochi",
      country: "India",
      qualification: "B.Sc",
      interestedCourse: "MBA",
      source: "WHATSAPP" as const,
    },
    {
      name: "Rohan Joshi",
      mobile: "919876543005",
      email: "rohan@example.com",
      city: "Pune",
      country: "India",
      qualification: "B.Tech CS",
      interestedCourse: "M.Tech",
      budget: 400000,
      source: "MANUAL_ENTRY" as const,
    },
  ];

  const leadStatuses = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "APPLICATION_SUBMITTED",
    "ADMISSION_CONFIRMED",
  ] as const;

  for (let i = 0; i < studentsData.length; i++) {
    const studentData = studentsData[i];
    const isAgencyReferral = studentData.source === "AGENCY_REFERRAL";
    const assignedBranch = isAgencyReferral ? (i % 2 === 0 ? branch1 : branch2) : null;
    const assignedCounselor = isAgencyReferral
      ? (i % 2 === 0 ? agencyCounselor1 : agencyCounselor3)
      : (i % 2 === 0 ? counselor1 : counselor2);

    const student = await prisma.student.upsert({
      where: { mobile: studentData.mobile },
      update: {},
      create: {
        ...studentData,
        mobileNumberNormalized: studentData.mobile,
        ...(isAgencyReferral && { agencyId: agency1.id, branchId: assignedBranch?.id }),
      },
    });

    await prisma.lead.upsert({
      where: { id: `seed-lead-${student.id}` },
      update: {},
      create: {
        id: `seed-lead-${student.id}`,
        studentId: student.id,
        source: studentData.source,
        status: leadStatuses[i % leadStatuses.length],
        score: 30 + i * 15,
        assignedToId: assignedCounselor.id,
        branchId: assignedBranch?.id,
        assignmentRule: "ROUND_ROBIN",
        isCurrent: true,
        lastContactedAt: i > 0 ? new Date() : undefined,
      },
    }).catch(async () => {
      const existing = await prisma.lead.findFirst({ where: { studentId: student.id, isCurrent: true } });
      if (!existing) {
        await prisma.lead.create({
          data: {
            studentId: student.id,
            source: studentData.source,
            status: leadStatuses[i % leadStatuses.length],
            score: 30 + i * 15,
            assignedToId: assignedCounselor.id,
            branchId: assignedBranch?.id,
            assignmentRule: "ROUND_ROBIN",
            isCurrent: true,
            lastContactedAt: i > 0 ? new Date() : undefined,
          },
        });
      }
    });

    // Add referral for agency student
    if (isAgencyReferral) {
      await prisma.studentReferral.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
          agencyId: agency1.id,
          studentId: student.id,
          referredById: assignedCounselor.id,
        },
      });
    }
  }

  console.log("✅ Students & Leads created");

  // ─── Student Profile Enhancement ───────────────────────────────────────────
  const { seedStudentProfile } = await import("./seed-student-profile");
  const allCourses = await prisma.course.findMany({
    select: { id: true, collegeId: true, name: true },
    take: 5,
  });
  await seedStudentProfile(prisma, counselor1.id, allCourses);

  // ─── Plans ────────────────────────────────────────────────────────────────
  await prisma.plan.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Starter",
        description: "For small colleges and agencies",
        price: 999,
        interval: "month",
        features: { applications: 50, users: 3, analytics: false },
        isActive: true,
      },
      {
        name: "Professional",
        description: "For growing institutions",
        price: 2999,
        interval: "month",
        features: { applications: 500, users: 10, analytics: true },
        isActive: true,
      },
      {
        name: "Enterprise",
        description: "For large colleges and agency networks",
        price: 9999,
        interval: "month",
        features: { applications: -1, users: -1, analytics: true, api: true },
        isActive: true,
      },
    ],
  });

  console.log("✅ Plans created");

  console.log("\n🎉 Seed complete! Summary:");
  console.log("  - 1 Super Admin");
  console.log("  - 2 Sugg Counselors");
  console.log("  - 1 College Admin (admissions@abcuniversity.com)");
  console.log("  - 3 Colleges (2 approved, 1 pending)");
  console.log("  - 4 Courses");
  console.log("  - 1 Agency (EduVision Consultants)");
  console.log("  - 2 Branches (Delhi Central, Mumbai)");
  console.log("  - 1 Agency Owner + 1 Agency Admin");
  console.log("  - 2 Branch Managers");
  console.log("  - 3 Agency Counselors");
  console.log("  - 5 Students with Leads");
  console.log("  - 3 Subscription Plans");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
