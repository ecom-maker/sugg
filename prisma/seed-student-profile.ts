import type { PrismaClient } from "@prisma/client";
import { CONSENT_TEXT_VERSION } from "../src/lib/consent";

export async function seedStudentProfile(prisma: PrismaClient, counselor1Id: string, courses: { id: string; collegeId: string; name: string }[]) {
  const arjun = await prisma.student.findFirst({ where: { mobile: "919876543001" } });
  if (!arjun) return;

  await prisma.student.update({
    where: { id: arjun.id },
    data: { mobileNumberNormalized: "919876543001" },
  });

  // Education history
  await prisma.studentEducationHistory.createMany({
    data: [
      { studentId: arjun.id, educationLevel: "TENTH", institutionName: "St. Mary's School", boardOrUniversity: "CBSE", yearOfCompletion: 2016, gradingSystem: "PERCENTAGE", scoreValue: 88 },
      { studentId: arjun.id, educationLevel: "TWELFTH", institutionName: "St. Mary's School", boardOrUniversity: "CBSE", streamOrMajor: "Commerce", yearOfCompletion: 2018, gradingSystem: "PERCENTAGE", scoreValue: 85 },
      { studentId: arjun.id, educationLevel: "BACHELOR", institutionName: "Mumbai University", boardOrUniversity: "MU", streamOrMajor: "B.Com", yearOfCompletion: 2021, gradingSystem: "PERCENTAGE", scoreValue: 72 },
    ],
    skipDuplicates: true,
  });

  // Test score
  await prisma.studentTestScore.upsert({
    where: { id: "seed-arjun-ielts" },
    create: {
      id: "seed-arjun-ielts",
      studentId: arjun.id,
      testType: "IELTS",
      overallScore: 7.0,
      sectionScores: { listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0 },
      testDate: new Date("2025-06-15"),
      validUntil: new Date("2027-06-15"),
    },
    update: {},
  }).catch(async () => {
    await prisma.studentTestScore.create({
      data: {
        studentId: arjun.id,
        testType: "IELTS",
        overallScore: 7.0,
        sectionScores: { listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0 },
        testDate: new Date("2025-06-15"),
        validUntil: new Date("2027-06-15"),
      },
    });
  });

  // Documents (paths only — no actual files in seed)
  const docs = [
    { id: "seed-doc-passport", type: "PASSPORT" as const, name: "Passport Scan", status: "VERIFIED" as const, expiry: new Date("2028-03-15") },
    { id: "seed-doc-12th", type: "TWELFTH_MARKSHEET" as const, name: "12th Marksheet", status: "VERIFIED" as const },
    { id: "seed-doc-ielts", type: "IELTS_SCORE" as const, name: "IELTS TRF", status: "PENDING" as const, expiry: new Date("2027-06-15") },
    { id: "seed-doc-sop", type: "SOP" as const, name: "Statement of Purpose", status: "PENDING" as const },
  ];

  for (const d of docs) {
    await prisma.studentDocument.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        studentId: arjun.id,
        documentType: d.type,
        documentName: d.name,
        fileUrl: `${arjun.id}/${d.id}/${d.name.replace(/ /g, "_")}.pdf`,
        fileSize: 245000,
        mimeType: "application/pdf",
        verificationStatus: d.status,
        verifiedById: d.status === "VERIFIED" ? counselor1Id : null,
        verifiedAt: d.status === "VERIFIED" ? new Date() : null,
        expiryDate: d.expiry ?? null,
        uploadedById: counselor1Id,
      },
      update: {},
    });
  }

  // Consents
  const consentTypes = ["DATA_PROCESSING", "CONTACT_WHATSAPP", "CONTACT_CALL", "CONTACT_EMAIL", "SHARE_WITH_COLLEGES", "SHARE_WITH_AGENCIES"] as const;
  for (const ct of consentTypes) {
    await prisma.studentConsent.upsert({
      where: { studentId_consentType: { studentId: arjun.id, consentType: ct } },
      create: {
        studentId: arjun.id,
        consentType: ct,
        consentGiven: true,
        consentSource: ct === "DATA_PROCESSING" ? "WHATSAPP" : "MANUAL",
        consentTextVersion: CONSENT_TEXT_VERSION,
        capturedById: counselor1Id,
      },
      update: {},
    });
  }

  // Shortlists (up to 3 courses)
  const shortlistCourses = courses.slice(0, 3);
  for (let i = 0; i < shortlistCourses.length; i++) {
    const c = shortlistCourses[i];
    await prisma.studentShortlist.upsert({
      where: { studentId_courseId: { studentId: arjun.id, courseId: c.id } },
      create: {
        studentId: arjun.id,
        courseId: c.id,
        collegeId: c.collegeId,
        priority: i + 1,
        shortlistedById: counselor1Id,
        status: "SHORTLISTED",
      },
      update: {},
    });
  }

  // WhatsApp messages for timeline
  await prisma.whatsappMessage.createMany({
    data: [
      { studentId: arjun.id, direction: "INBOUND", type: "text", content: "Hi, I want to apply for MBA", status: "DELIVERED", sentAt: new Date("2026-01-10") },
      { studentId: arjun.id, direction: "OUTBOUND", senderId: counselor1Id, type: "text", content: "Hello Arjun! Let me help you with MBA options.", status: "DELIVERED", sentAt: new Date("2026-01-10") },
    ],
    skipDuplicates: true,
  });

  // Lead note
  const lead = await prisma.lead.findFirst({ where: { studentId: arjun.id, isCurrent: true } });
  if (lead) {
    await prisma.leadNote.create({
      data: { leadId: lead.id, userId: counselor1Id, content: "Interested in top MBA programs in India. Budget ~25L." },
    });
  }

  // Duplicate pair for merge tool testing
  const dupStudent = await prisma.student.upsert({
    where: { mobile: "919876543099" },
    update: {},
    create: {
      name: "Arjun M. (Duplicate)",
      mobile: "919876543099",
      mobileNumberNormalized: "919876543099",
      email: "arjun@example.com",
      source: "MANUAL_ENTRY",
    },
  });

  await prisma.lead.upsert({
    where: { id: "seed-dup-lead" },
    create: {
      id: "seed-dup-lead",
      studentId: dupStudent.id,
      source: "MANUAL_ENTRY",
      status: "NEW",
      score: 10,
      isCurrent: true,
    },
    update: {},
  }).catch(async () => {
    const existing = await prisma.lead.findFirst({ where: { studentId: dupStudent.id } });
    if (!existing) {
      await prisma.lead.create({
        data: { studentId: dupStudent.id, source: "MANUAL_ENTRY", status: "NEW", score: 10, isCurrent: true },
      });
    }
  });

  const [aId, bId] = arjun.id < dupStudent.id ? [arjun.id, dupStudent.id] : [dupStudent.id, arjun.id];
  await prisma.studentDuplicateFlag.upsert({
    where: { studentAId_studentBId: { studentAId: aId, studentBId: bId } },
    create: { studentAId: aId, studentBId: bId, reason: "EMAIL_MATCH" },
    update: {},
  });

  console.log("✅ Student profile enhancement seed created");
}
