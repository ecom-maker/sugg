"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/auth";
import { requireStudentAccess, canWriteStudent } from "@/lib/student-scope";
import { logStudentAction } from "@/lib/student-audit";
import {
  uploadStudentDocument,
  validateStudentDocument,
  getStudentDocumentPath,
  deleteStudentDocumentFile,
} from "@/lib/student-storage";
import { CONSENT_TEXT_VERSION } from "@/lib/consent";
import { getCurrentLeadRecord } from "@/lib/student-lead";
import { createBulkNotifications } from "@/lib/notifications";
import type { ConsentType, ConsentSource, StudentDocumentType, StudentEducationLevel, GradingSystem, StudentTestType } from "@prisma/client";

// ─── Documents ───────────────────────────────────────────────────────────────

export async function uploadStudentDocumentAction(studentId: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const file = formData.get("file") as File | null;
  const documentType = formData.get("documentType") as StudentDocumentType;
  const documentName = (formData.get("documentName") as string) || file?.name || "Document";
  const expiryDate = formData.get("expiryDate") as string | null;

  if (!file || !documentType) return { error: "File and document type required" };

  const validation = validateStudentDocument({ type: file.type, size: file.size });
  if (validation) return { error: validation };

  const docId = crypto.randomUUID();
  const path = getStudentDocumentPath(studentId, docId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await uploadStudentDocument(path, buffer, file.type);
  if ("error" in upload) return { error: upload.error };

  const doc = await prisma.studentDocument.create({
    data: {
      id: docId,
      studentId,
      documentType,
      documentName,
      fileUrl: path,
      fileSize: file.size,
      mimeType: file.type,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      uploadedById: user.id,
    },
  });

  await logStudentAction(user.id, "DOCUMENT_UPLOADED", studentId, undefined, {
    documentId: doc.id,
    documentType,
    documentName,
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true, document: doc };
}

export async function verifyStudentDocument(
  studentId: string,
  docId: string,
  status: "VERIFIED" | "REJECTED"
) {
  const user = await getAuthUser();
  if (!user) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const doc = await prisma.studentDocument.update({
    where: { id: docId, studentId },
    data: {
      verificationStatus: status,
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
  });

  await logStudentAction(user.id, status === "VERIFIED" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED", studentId, undefined, {
    documentId: docId,
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

export async function archiveStudentDocument(studentId: string, docId: string) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  await prisma.studentDocument.update({
    where: { id: docId, studentId },
    data: { status: "ARCHIVED" },
  });

  await logStudentAction(user.id, "DOCUMENT_ARCHIVED", studentId, undefined, { documentId: docId });
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

// ─── Education ───────────────────────────────────────────────────────────────

const educationSchema = z.object({
  educationLevel: z.string(),
  institutionName: z.string().min(1),
  boardOrUniversity: z.string().optional(),
  streamOrMajor: z.string().optional(),
  yearOfCompletion: z.string().optional(),
  gradingSystem: z.string(),
  scoreValue: z.string(),
  scoreMax: z.string().optional(),
  countryId: z.string().optional(),
});

export async function createEducationHistory(studentId: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const raw = Object.fromEntries(formData.entries());
  const parsed = educationSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const d = parsed.data;
  const record = await prisma.studentEducationHistory.create({
    data: {
      studentId,
      educationLevel: d.educationLevel as StudentEducationLevel,
      institutionName: d.institutionName,
      boardOrUniversity: d.boardOrUniversity || null,
      streamOrMajor: d.streamOrMajor || null,
      yearOfCompletion: d.yearOfCompletion ? parseInt(d.yearOfCompletion) : null,
      gradingSystem: d.gradingSystem as GradingSystem,
      scoreValue: parseFloat(d.scoreValue),
      scoreMax: d.scoreMax ? parseFloat(d.scoreMax) : null,
      countryId: d.countryId || null,
    },
  });

  await logStudentAction(user.id, "EDUCATION_CREATED", studentId, undefined, { educationId: record.id });
  revalidatePath(`/students/${studentId}`);
  return { success: true, record };
}

export async function archiveEducationHistory(studentId: string, eduId: string) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  await prisma.studentEducationHistory.update({
    where: { id: eduId, studentId },
    data: { status: "ARCHIVED" },
  });

  await logStudentAction(user.id, "EDUCATION_ARCHIVED", studentId, undefined, { educationId: eduId });
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

// ─── Test Scores ─────────────────────────────────────────────────────────────

const testScoreSchema = z.object({
  testType: z.string(),
  overallScore: z.string(),
  sectionScores: z.string().optional(),
  testDate: z.string().optional(),
  validUntil: z.string().optional(),
  documentId: z.string().optional(),
});

export async function createTestScore(studentId: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const raw = Object.fromEntries(formData.entries());
  const parsed = testScoreSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data" };

  const d = parsed.data;
  const score = await prisma.studentTestScore.create({
    data: {
      studentId,
      testType: d.testType as StudentTestType,
      overallScore: parseFloat(d.overallScore),
      sectionScores: d.sectionScores ? JSON.parse(d.sectionScores) : undefined,
      testDate: d.testDate ? new Date(d.testDate) : null,
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      documentId: d.documentId || null,
    },
  });

  await logStudentAction(user.id, "TEST_SCORE_CREATED", studentId, undefined, { scoreId: score.id });
  revalidatePath(`/students/${studentId}`);
  return { success: true, score };
}

// ─── Shortlist ───────────────────────────────────────────────────────────────

export async function addToShortlist(studentId: string, courseId: string, notes?: string) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { college: { select: { id: true, name: true } } },
  });
  if (!course) return { error: "Course not found" };

  const activeCount = await prisma.studentShortlist.count({
    where: { studentId, status: { in: ["SHORTLISTED", "APPLIED", "OFFER_RECEIVED"] } },
  });
  if (activeCount >= 5) {
    return { error: "Student already has 5 active shortlist entries. Remove one before adding more.", warn: true };
  }

  const maxPriority = await prisma.studentShortlist.aggregate({
    where: { studentId },
    _max: { priority: true },
  });

  const entry = await prisma.studentShortlist.create({
    data: {
      studentId,
      courseId,
      collegeId: course.collegeId,
      priority: (maxPriority._max.priority ?? 0) + 1,
      shortlistedById: user.id,
      notes: notes || null,
    },
    include: { course: true, college: { select: { name: true } } },
  });

  // Advance lead status to COLLEGE_SHORTLISTED if first entry
  if (activeCount === 0) {
    const lead = await getCurrentLeadRecord(studentId);
    if (lead && !["COLLEGE_SHORTLISTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED", "ADMISSION_CONFIRMED"].includes(lead.status)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "COLLEGE_SHORTLISTED" },
      });
    }
  }

  await logStudentAction(user.id, "SHORTLIST_ADDED", studentId, undefined, {
    shortlistId: entry.id,
    courseId,
    collegeId: course.collegeId,
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true, entry };
}

export async function removeFromShortlist(studentId: string, entryId: string) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  await prisma.studentShortlist.delete({ where: { id: entryId, studentId } });
  await logStudentAction(user.id, "SHORTLIST_REMOVED", studentId, undefined, { shortlistId: entryId });
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

export async function applyFromShortlist(
  studentId: string,
  entryId: string,
  options?: { documentOverrideReason?: string }
) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const entry = await prisma.studentShortlist.findUnique({
    where: { id: entryId, studentId },
    include: { course: true },
  });
  if (!entry) return { error: "Shortlist entry not found" };

  const shareConsent = await prisma.studentConsent.findFirst({
    where: { studentId, consentType: "SHARE_WITH_COLLEGES", consentGiven: true, withdrawnAt: null },
  });
  if (!shareConsent) {
    return { error: "SHARE_WITH_COLLEGES consent required before submitting application" };
  }

  const existing = await prisma.application.findFirst({
    where: {
      studentId,
      collegeId: entry.collegeId,
      courseId: entry.courseId,
      status: { notIn: ["REJECTED"] },
    },
  });
  if (existing) return { error: "Application already exists for this course" };

  const application = await prisma.application.create({
    data: {
      studentId,
      collegeId: entry.collegeId,
      courseId: entry.courseId,
      status: "SUBMITTED",
      submittedById: user.id,
      notes: options?.documentOverrideReason
        ? `Document checklist override: ${options.documentOverrideReason}`
        : null,
    },
  });

  await prisma.applicationStatusHistory.create({
    data: {
      applicationId: application.id,
      status: "SUBMITTED",
      changedById: user.id,
      notes: "Created from shortlist",
    },
  });

  await prisma.studentShortlist.update({
    where: { id: entryId },
    data: { status: "APPLIED", applicationId: application.id },
  });

  const lead = await getCurrentLeadRecord(studentId);
  if (lead && !["APPLICATION_SUBMITTED", "OFFER_RECEIVED", "ADMISSION_CONFIRMED"].includes(lead.status)) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "APPLICATION_SUBMITTED" },
    });
  }

  if (options?.documentOverrideReason) {
    await logStudentAction(user.id, "DOCUMENT_CHECKLIST_OVERRIDE", studentId, undefined, {
      applicationId: application.id,
      reason: options.documentOverrideReason,
    });
  }

  await logStudentAction(user.id, "SHORTLIST_APPLIED", studentId, undefined, {
    shortlistId: entryId,
    applicationId: application.id,
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true, applicationId: application.id };
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export async function captureConsent(
  studentId: string,
  consentType: ConsentType,
  consentGiven: boolean,
  source: ConsentSource
) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  const consent = await prisma.studentConsent.upsert({
    where: { studentId_consentType: { studentId, consentType } },
    create: {
      studentId,
      consentType,
      consentGiven,
      consentSource: source,
      consentTextVersion: CONSENT_TEXT_VERSION,
      capturedById: user.id,
    },
    update: {
      consentGiven,
      consentSource: source,
      consentTextVersion: CONSENT_TEXT_VERSION,
      capturedById: user.id,
      capturedAt: new Date(),
      withdrawnAt: consentGiven ? null : new Date(),
    },
  });

  await logStudentAction(user.id, "CONSENT_CAPTURED", studentId, undefined, {
    consentType,
    consentGiven,
    source,
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true, consent };
}

export async function withdrawConsent(studentId: string, consentId: string) {
  const user = await getAuthUser();
  if (!user || !canWriteStudent(user.role)) return { error: "Unauthorized" };

  const access = await requireStudentAccess(user, studentId, "write");
  if ("error" in access) return { error: access.error };

  await prisma.studentConsent.update({
    where: { id: consentId, studentId },
    data: { consentGiven: false, withdrawnAt: new Date() },
  });

  await logStudentAction(user.id, "CONSENT_WITHDRAWN", studentId, undefined, { consentId });
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

// ─── Admin: Merge, Anonymize, Export ─────────────────────────────────────────

export async function mergeStudents(survivingId: string, duplicateId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);
  if (survivingId === duplicateId) return { error: "Cannot merge same student" };

  const [surviving, duplicate] = await Promise.all([
    prisma.student.findUnique({ where: { id: survivingId } }),
    prisma.student.findUnique({ where: { id: duplicateId } }),
  ]);

  if (!surviving || !duplicate) return { error: "Student not found" };

  await prisma.$transaction(async (tx) => {
    const dupLead = await tx.lead.findFirst({ where: { studentId: duplicateId, isCurrent: true } });
    const survLead = await tx.lead.findFirst({ where: { studentId: survivingId, isCurrent: true } });

    if (dupLead && survLead) {
      await tx.leadNote.updateMany({ where: { leadId: dupLead.id }, data: { leadId: survLead.id } });
      await tx.leadFollowup.updateMany({ where: { leadId: dupLead.id }, data: { leadId: survLead.id } });
      await tx.lead.delete({ where: { id: dupLead.id } });
    } else if (dupLead && !survLead) {
      await tx.lead.update({ where: { id: dupLead.id }, data: { studentId: survivingId } });
    }

    await tx.whatsappMessage.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.application.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.studentDocument.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.studentEducationHistory.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.studentTestScore.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.studentConsent.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });
    await tx.call.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } });

    // Shortlists may conflict on unique student+course — skip duplicates
    const dupShortlists = await tx.studentShortlist.findMany({ where: { studentId: duplicateId } });
    for (const sl of dupShortlists) {
      const exists = await tx.studentShortlist.findUnique({
        where: { studentId_courseId: { studentId: survivingId, courseId: sl.courseId } },
      });
      if (!exists) {
        await tx.studentShortlist.update({ where: { id: sl.id }, data: { studentId: survivingId } });
      } else {
        await tx.studentShortlist.delete({ where: { id: sl.id } });
      }
    }

    await tx.studentReferral.updateMany({ where: { studentId: duplicateId }, data: { studentId: survivingId } }).catch(() => {});

    await tx.student.update({
      where: { id: duplicateId },
      data: { isActive: false, mergedIntoId: survivingId },
    });

    await tx.studentDuplicateFlag.updateMany({
      where: { OR: [{ studentAId: duplicateId }, { studentBId: duplicateId }] },
      data: { status: "MERGED", reviewedById: user.id, reviewedAt: new Date() },
    });
  });

  await logStudentAction(user.id, "STUDENTS_MERGED", survivingId, { duplicateId }, { survivingId });
  revalidatePath("/admin/students/duplicates");
  return { success: true };
}

export async function anonymizeStudent(studentId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { documents: { where: { status: "ACTIVE" } }, leads: { where: { isCurrent: true }, take: 1 } },
  });
  if (!student) return { error: "Student not found" };

  // Delete documents from storage
  for (const doc of student.documents) {
    await deleteStudentDocumentFile(doc.fileUrl).catch(() => {});
  }

  await prisma.$transaction([
    prisma.studentDocument.updateMany({
      where: { studentId },
      data: { status: "ARCHIVED" },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        name: `Anonymized ${studentId.slice(0, 8)}`,
        mobile: `anon-${studentId}`,
        mobileNumberNormalized: null,
        email: null,
        city: null,
        whatsappId: null,
        isAnonymized: true,
      },
    }),
  ]);

  await logStudentAction(user.id, "STUDENT_ANONYMIZED", studentId);

  if (student.branchId) {
    const branch = await prisma.agencyBranch.findUnique({
      where: { id: student.branchId },
      select: { managerId: true },
    });
    if (branch?.managerId) {
      await createBulkNotifications([branch.managerId], {
        type: "STUDENT_ANONYMIZED",
        title: "Student Anonymized",
        message: `A student on your branch was anonymized per data subject request.`,
        resourceId: studentId,
      });
    }
  }

  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

export async function exportStudentData(studentId: string) {
  const user = await requireRole(["SUPER_ADMIN"]);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      leads: { include: { notes: true, followups: true } },
      documents: true,
      educationHistory: true,
      testScores: true,
      shortlists: { include: { course: true, college: true } },
      consents: true,
      applications: { include: { statusHistory: true } },
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 500 },
    },
  });

  if (!student) return { error: "Student not found" };

  await logStudentAction(user.id, "STUDENT_EXPORTED", studentId);
  return { success: true, data: student };
}

// ─── Document expiry cron helper ─────────────────────────────────────────────

export async function processExpiringDocuments() {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 90);

  const expiring = await prisma.studentDocument.findMany({
    where: {
      status: "ACTIVE",
      expiryDate: { lte: threshold, gte: new Date() },
    },
    include: {
      student: {
        include: { leads: { where: { isCurrent: true }, take: 1, select: { assignedToId: true } } },
      },
    },
  });

  for (const doc of expiring) {
    const counselorId = doc.student.leads[0]?.assignedToId;
    if (counselorId) {
      await createBulkNotifications([counselorId], {
        type: "DOCUMENT_EXPIRING",
        title: "Document Expiring Soon",
        message: `${doc.documentName} for ${doc.student.name} expires on ${doc.expiryDate?.toLocaleDateString()}`,
        resourceId: doc.studentId,
      });
    }
  }

  return { processed: expiring.length };
}
