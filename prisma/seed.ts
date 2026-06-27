import { PrismaClient } from "@prisma/client";

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

  // ─── Colleges ─────────────────────────────────────────────────────────────
  const college1 = await prisma.college.upsert({
    where: { slug: "iim-ahmedabad" },
    update: {},
    create: {
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
    update: {},
    create: {
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
    update: {},
    create: {
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

  // ─── Agency ───────────────────────────────────────────────────────────────
  const agency1 = await prisma.agency.upsert({
    where: { slug: "eduvision-consultants" },
    update: {},
    create: {
      name: "EduVision Consultants",
      slug: "eduvision-consultants",
      email: "info@eduvision.in",
      phone: "+91 98765 43210",
      website: "https://eduvision.in",
      city: "Delhi",
      country: "India",
      isActive: true,
      isVerified: true,
    },
  });

  console.log("✅ Agency created");

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
    const student = await prisma.student.upsert({
      where: { mobile: studentData.mobile },
      update: {},
      create: studentData,
    });

    await prisma.lead.upsert({
      where: { studentId: student.id },
      update: {},
      create: {
        studentId: student.id,
        source: studentData.source,
        status: leadStatuses[i % leadStatuses.length],
        score: 30 + i * 15,
        assignedToId: i % 2 === 0 ? counselor1.id : counselor2.id,
        assignmentRule: "ROUND_ROBIN",
        lastContactedAt: i > 0 ? new Date() : undefined,
      },
    });

    // Add referral for agency student
    if (studentData.source === "AGENCY_REFERRAL") {
      await prisma.studentReferral.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
          agencyId: agency1.id,
          studentId: student.id,
        },
      });
    }
  }

  console.log("✅ Students & Leads created");

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
  console.log("  - 2 Counselors");
  console.log("  - 3 Colleges (2 approved, 1 pending)");
  console.log("  - 4 Courses");
  console.log("  - 1 Agency");
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
