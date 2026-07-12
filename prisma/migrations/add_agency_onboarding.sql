-- ============================================================
-- Migration: Agency Onboarding & Self-Service Module
-- Adds the agency lifecycle (registration → verify → approve) and
-- append-only lead status history. Additive & backward-compatible;
-- existing agencies backfilled as ADMIN_CREATED / verified.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Enums --------------------------------------------------------------------

ALTER TYPE "AgencyApprovalStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

DO $$ BEGIN CREATE TYPE "OnboardingSource" AS ENUM ('SELF_REGISTERED', 'ADMIN_CREATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "AgencyUserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "AgencySpecialization" AS ENUM
  ('DOMESTIC_ADMISSIONS', 'STUDY_ABROAD', 'MEDICAL', 'ENGINEERING', 'MANAGEMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New notification types for the agency onboarding workflow.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_AGENCY_REGISTRATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUNSELOR_ACTIVATED';

-- 2. agencies: onboarding + owner/manager + verification ----------------------

ALTER TABLE "agencies"
  ADD COLUMN IF NOT EXISTS "owner_email"              TEXT,
  ADD COLUMN IF NOT EXISTS "manager_name"             TEXT,
  ADD COLUMN IF NOT EXISTS "manager_phone"            TEXT,
  ADD COLUMN IF NOT EXISTS "manager_email"            TEXT,
  ADD COLUMN IF NOT EXISTS "year_established"         INTEGER,
  ADD COLUMN IF NOT EXISTS "counselor_count_estimate" INTEGER,
  ADD COLUMN IF NOT EXISTS "specialization"          "AgencySpecialization"[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "onboarding_source"       "OnboardingSource" NOT NULL DEFAULT 'ADMIN_CREATED',
  ADD COLUMN IF NOT EXISTS "verification_token"       TEXT,
  ADD COLUMN IF NOT EXISTS "verification_expiry"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "email_verified"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mobile_verified"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "approved_by_id"           TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at"              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "rejection_reason"         TEXT;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: existing agencies pre-date onboarding — treat as admin-created and
-- fully verified so nothing changes for them.
UPDATE "agencies"
   SET "email_verified" = true, "mobile_verified" = true, "is_verified" = true
 WHERE "onboarding_source" = 'ADMIN_CREATED';

-- 3. agency_users: staff lifecycle status -------------------------------------

ALTER TABLE "agency_users"
  ADD COLUMN IF NOT EXISTS "status" "AgencyUserStatus" NOT NULL DEFAULT 'ACTIVE';

-- 4. lead_status_history (append-only) ----------------------------------------

CREATE TABLE IF NOT EXISTS "lead_status_history" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "lead_id"       TEXT        NOT NULL,
  "from_status"   "LeadStatus",
  "to_status"     "LeadStatus" NOT NULL,
  "changed_by_id" TEXT,
  "note"          TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "lead_status_history"
    ADD CONSTRAINT "lead_status_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lead_status_history"
    ADD CONSTRAINT "lead_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_lead_status_history_lead_id" ON "lead_status_history"("lead_id");

-- 5. Indexes ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_agencies_onboarding_source" ON "agencies"("onboarding_source");

-- Done! Run the seed script after this migration.
