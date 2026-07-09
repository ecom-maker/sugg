-- ============================================================
-- Migration: Student Profile Enhancement Module
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Enums
DO $$ BEGIN CREATE TYPE "StudentDocumentType" AS ENUM (
  'TENTH_MARKSHEET','TWELFTH_MARKSHEET','BACHELOR_DEGREE','BACHELOR_TRANSCRIPT',
  'MASTER_DEGREE','PASSPORT','NATIONAL_ID','PHOTO','IELTS_SCORE','TOEFL_SCORE',
  'PTE_SCORE','GRE_SCORE','GMAT_SCORE','SOP','LOR','RESUME',
  'WORK_EXPERIENCE_LETTER','FINANCIAL_STATEMENT','OTHER'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING','VERIFIED','REJECTED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "StudentDocumentStatus" AS ENUM ('ACTIVE','ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "StudentEducationLevel" AS ENUM ('TENTH','TWELFTH','DIPLOMA','BACHELOR','MASTER','DOCTORATE','CERTIFICATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "GradingSystem" AS ENUM ('PERCENTAGE','CGPA_10','CGPA_4','GPA','GRADE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "EducationRecordStatus" AS ENUM ('ACTIVE','ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "StudentTestType" AS ENUM ('IELTS','TOEFL','PTE','GRE','GMAT','SAT','DUOLINGO','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ShortlistStatus" AS ENUM ('SHORTLISTED','APPLIED','OFFER_RECEIVED','REJECTED','WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ConsentType" AS ENUM (
  'DATA_PROCESSING','CONTACT_WHATSAPP','CONTACT_CALL','CONTACT_EMAIL',
  'SHARE_WITH_COLLEGES','SHARE_WITH_AGENCIES'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ConsentSource" AS ENUM ('WHATSAPP','FORM','VERBAL_RECORDED','MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DuplicateFlagReason" AS ENUM ('EMAIL_MATCH','MOBILE_COLLISION','MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DuplicateFlagStatus" AS ENUM ('PENDING','MERGED','DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POSSIBLE_DUPLICATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STUDENT_ANONYMIZED';

-- Lead: allow multiple leads per student (re-engagement)
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_student_id_key";
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "is_current" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "leads_student_id_is_current_idx" ON "leads"("student_id", "is_current");
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mobile_number_normalized" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_anonymized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "merged_into_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "students" ADD CONSTRAINT "students_merged_into_id_fkey"
    FOREIGN KEY ("merged_into_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Backfill mobile_number_normalized (E.164 without +)
UPDATE "students"
SET "mobile_number_normalized" = CASE
  WHEN LENGTH(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')) = 10
    THEN '91' || REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')
  ELSE REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')
END
WHERE "mobile_number_normalized" IS NULL;

-- Note: unique constraint on mobile_number_normalized added after collision resolution
-- CREATE UNIQUE INDEX students_mobile_normalized_unique ON students(mobile_number_normalized) WHERE mobile_number_normalized IS NOT NULL;

-- 4. student_documents
CREATE TABLE IF NOT EXISTS "student_documents" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id"          TEXT NOT NULL,
  "document_type"       "StudentDocumentType" NOT NULL,
  "document_name"       TEXT NOT NULL,
  "file_url"            TEXT NOT NULL,
  "file_size"           INTEGER NOT NULL,
  "mime_type"           TEXT NOT NULL,
  "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verified_by_id"      TEXT,
  "verified_at"         TIMESTAMPTZ,
  "expiry_date"         TIMESTAMPTZ,
  "uploaded_by_id"      TEXT NOT NULL,
  "status"              "StudentDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "student_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 5. student_education_history
CREATE TABLE IF NOT EXISTS "student_education_history" (
  "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id"           TEXT NOT NULL,
  "education_level"      "StudentEducationLevel" NOT NULL,
  "institution_name"     TEXT NOT NULL,
  "board_or_university"  TEXT,
  "stream_or_major"      TEXT,
  "year_of_completion"   INTEGER,
  "grading_system"       "GradingSystem" NOT NULL,
  "score_value"          DECIMAL(8,2) NOT NULL,
  "score_max"            DECIMAL(8,2),
  "country_id"           TEXT,
  "migrated_from_legacy" BOOLEAN NOT NULL DEFAULT false,
  "status"               "EducationRecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_education_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_education_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_education_history_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL
);

-- 6. student_test_scores
CREATE TABLE IF NOT EXISTS "student_test_scores" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id"      TEXT NOT NULL,
  "test_type"       "StudentTestType" NOT NULL,
  "overall_score"   DECIMAL(8,2) NOT NULL,
  "section_scores"  JSONB,
  "test_date"       TIMESTAMPTZ,
  "valid_until"     TIMESTAMPTZ,
  "document_id"     TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_test_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_test_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_test_scores_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "student_documents"("id") ON DELETE SET NULL
);

-- 7. student_shortlists
CREATE TABLE IF NOT EXISTS "student_shortlists" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id"        TEXT NOT NULL,
  "course_id"         TEXT NOT NULL,
  "college_id"        TEXT NOT NULL,
  "priority"          INTEGER NOT NULL DEFAULT 1,
  "status"            "ShortlistStatus" NOT NULL DEFAULT 'SHORTLISTED',
  "shortlisted_by_id" TEXT NOT NULL,
  "application_id"    TEXT UNIQUE,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_shortlists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_shortlists_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_shortlists_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "student_shortlists_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE CASCADE,
  CONSTRAINT "student_shortlists_shortlisted_by_id_fkey" FOREIGN KEY ("shortlisted_by_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "student_shortlists_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL,
  CONSTRAINT "student_shortlists_student_id_course_id_key" UNIQUE ("student_id", "course_id")
);

-- 8. student_consents
CREATE TABLE IF NOT EXISTS "student_consents" (
  "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_id"           TEXT NOT NULL,
  "consent_type"         "ConsentType" NOT NULL,
  "consent_given"        BOOLEAN NOT NULL,
  "consent_source"       "ConsentSource" NOT NULL,
  "consent_text_version" TEXT NOT NULL,
  "captured_by_id"       TEXT,
  "captured_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "withdrawn_at"         TIMESTAMPTZ,
  CONSTRAINT "student_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_consents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_consents_captured_by_id_fkey" FOREIGN KEY ("captured_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "student_consents_student_id_consent_type_key" UNIQUE ("student_id", "consent_type")
);

-- 9. student_duplicate_flags
CREATE TABLE IF NOT EXISTS "student_duplicate_flags" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "student_a_id"   TEXT NOT NULL,
  "student_b_id"   TEXT NOT NULL,
  "reason"         "DuplicateFlagReason" NOT NULL,
  "status"         "DuplicateFlagStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by_id" TEXT,
  "reviewed_at"    TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_duplicate_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_duplicate_flags_student_a_id_fkey" FOREIGN KEY ("student_a_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_duplicate_flags_student_b_id_fkey" FOREIGN KEY ("student_b_id") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_duplicate_flags_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "student_duplicate_flags_student_a_id_student_b_id_key" UNIQUE ("student_a_id", "student_b_id")
);

-- Flag mobile collisions for manual review
INSERT INTO "student_duplicate_flags" ("id", "student_a_id", "student_b_id", "reason", "status", "created_at")
SELECT gen_random_uuid()::text, s1.id, s2.id, 'MOBILE_COLLISION', 'PENDING', NOW()
FROM "students" s1
JOIN "students" s2 ON s1."mobile_number_normalized" = s2."mobile_number_normalized" AND s1.id < s2.id
WHERE s1."mobile_number_normalized" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 10. Best-effort education history migration from legacy fields
INSERT INTO "student_education_history" (
  "id", "student_id", "education_level", "institution_name", "grading_system",
  "score_value", "migrated_from_legacy", "status", "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  s.id,
  CASE
    WHEN LOWER(s.education_level) LIKE '%master%' OR LOWER(s.qualification) LIKE '%m.%' THEN 'MASTER'::"StudentEducationLevel"
    WHEN LOWER(s.education_level) LIKE '%bachelor%' OR LOWER(s.qualification) LIKE '%b.%' THEN 'BACHELOR'::"StudentEducationLevel"
    WHEN LOWER(s.education_level) LIKE '%12%' OR LOWER(s.qualification) LIKE '%12%' THEN 'TWELFTH'::"StudentEducationLevel"
    ELSE 'BACHELOR'::"StudentEducationLevel"
  END,
  COALESCE(s.qualification, 'Legacy Record'),
  'PERCENTAGE'::"GradingSystem",
  0,
  true,
  'ACTIVE'::"EducationRecordStatus",
  NOW(),
  NOW()
FROM "students" s
WHERE (s.education_level IS NOT NULL OR s.qualification IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "student_education_history" eh WHERE eh.student_id = s.id AND eh.migrated_from_legacy = true
  );

-- 11. Storage bucket (run in Supabase dashboard or via API)
-- Bucket: student-documents (private)
-- Policy: service role full access; authenticated users via signed URLs only
