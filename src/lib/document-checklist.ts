import type { DegreeType, StudentDocumentType } from "@prisma/client";

const BASE_DOCS: StudentDocumentType[] = ["PASSPORT", "PHOTO", "TENTH_MARKSHEET", "TWELFTH_MARKSHEET"];

const DEGREE_DOCS: Partial<Record<DegreeType, StudentDocumentType[]>> = {
  BACHELOR: ["BACHELOR_DEGREE", "BACHELOR_TRANSCRIPT"],
  MASTER: ["BACHELOR_DEGREE", "BACHELOR_TRANSCRIPT", "IELTS_SCORE", "SOP", "LOR", "RESUME"],
  DOCTORATE: ["MASTER_DEGREE", "BACHELOR_DEGREE", "GRE_SCORE", "SOP", "LOR", "RESUME"],
  DIPLOMA: ["TWELFTH_MARKSHEET"],
  CERTIFICATE: ["TWELFTH_MARKSHEET"],
};

export function getRequiredDocuments(degreeType: DegreeType): StudentDocumentType[] {
  const extra = DEGREE_DOCS[degreeType] ?? [];
  return [...new Set([...BASE_DOCS, ...extra])];
}

export interface ChecklistItem {
  documentType: StudentDocumentType;
  label: string;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
  documentId?: string;
  expiryDate?: string | null;
}

export function buildDocumentChecklist(
  requiredTypes: StudentDocumentType[],
  uploaded: Array<{
    id: string;
    documentType: StudentDocumentType;
    verificationStatus: string;
    expiryDate: Date | null;
  }>
): ChecklistItem[] {
  const labels: Record<string, string> = {
    TENTH_MARKSHEET: "10th Marksheet",
    TWELFTH_MARKSHEET: "12th Marksheet",
    BACHELOR_DEGREE: "Bachelor Degree",
    BACHELOR_TRANSCRIPT: "Bachelor Transcript",
    MASTER_DEGREE: "Master Degree",
    PASSPORT: "Passport",
    NATIONAL_ID: "National ID",
    PHOTO: "Photo",
    IELTS_SCORE: "IELTS Score Report",
    TOEFL_SCORE: "TOEFL Score Report",
    PTE_SCORE: "PTE Score Report",
    GRE_SCORE: "GRE Score Report",
    GMAT_SCORE: "GMAT Score Report",
    SOP: "Statement of Purpose",
    LOR: "Letter of Recommendation",
    RESUME: "Resume/CV",
    WORK_EXPERIENCE_LETTER: "Work Experience Letter",
    FINANCIAL_STATEMENT: "Financial Statement",
    OTHER: "Other",
  };

  return requiredTypes.map((type) => {
    const doc = uploaded.find((d) => d.documentType === type);
    return {
      documentType: type,
      label: labels[type] ?? type,
      required: true,
      uploaded: !!doc,
      verified: doc?.verificationStatus === "VERIFIED",
      documentId: doc?.id,
      expiryDate: doc?.expiryDate?.toISOString() ?? null,
    };
  });
}

export function getMissingRequired(
  checklist: ChecklistItem[]
): ChecklistItem[] {
  return checklist.filter((c) => c.required && !c.uploaded);
}
