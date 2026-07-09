import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";
import { hasActiveConsent } from "@/lib/consent";
import { formatMobileDisplay } from "@/lib/mobile-normalize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const { student } = access;

  const [documents, education, testScores, shortlists, applications, photo] = await Promise.all([
    prisma.studentDocument.count({ where: { studentId: id, status: "ACTIVE" } }),
    prisma.studentEducationHistory.findMany({ where: { studentId: id, status: "ACTIVE" }, orderBy: { yearOfCompletion: "desc" } }),
    prisma.studentTestScore.findMany({ where: { studentId: id }, orderBy: { testDate: "desc" } }),
    prisma.studentShortlist.findMany({
      where: { studentId: id },
      include: { course: { select: { name: true, degreeType: true, annualFee: true, commissionType: true, commissionValue: true } }, college: { select: { name: true } } },
      orderBy: { priority: "asc" },
    }),
    prisma.application.findMany({
      where: { studentId: id },
      include: { college: { select: { name: true } }, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.studentDocument.findFirst({
      where: { studentId: id, documentType: "PHOTO", status: "ACTIVE", verificationStatus: "VERIFIED" },
      select: { id: true },
    }),
  ]);

  const nextFollowup = student.lead?.followups[0] ?? null;

  return NextResponse.json({
    header: {
      id: student.id,
      name: student.name,
      mobile: student.mobile,
      mobileDisplay: student.mobileNumberNormalized
        ? formatMobileDisplay(student.mobileNumberNormalized)
        : student.mobile,
      email: student.email,
      source: student.source,
      agency: student.agency,
      branch: student.branch,
      counselor: student.lead?.assignedTo,
      leadStatus: student.lead?.status,
      leadScore: student.lead?.score,
      isAnonymized: student.isAnonymized,
      geoBreadcrumb: student.geoDistrict
        ? [student.geoDistrict.state.country.countryName, student.geoDistrict.state.stateName, student.geoDistrict.districtName]
        : [],
      photoDocumentId: photo?.id,
      consents: {
        dataProcessing: hasActiveConsent(student.consents, "DATA_PROCESSING"),
        whatsapp: hasActiveConsent(student.consents, "CONTACT_WHATSAPP"),
        shareColleges: hasActiveConsent(student.consents, "SHARE_WITH_COLLEGES"),
        shareAgencies: hasActiveConsent(student.consents, "SHARE_WITH_AGENCIES"),
      },
      documentCount: documents,
      nextFollowup,
    },
    overview: {
      educationLevel: student.educationLevel,
      qualification: student.qualification,
      interestedCourse: student.interestedCourse,
      preferredCollege: student.preferredCollege,
      preferredCountry: student.preferredCountry,
      budget: student.budget,
      shortlists,
      applications: applications.slice(0, 5),
      education: education.slice(0, 3),
      testScores: testScores.slice(0, 2),
    },
  });
}
