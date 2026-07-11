-- ============================================================
-- Migration: Sugg Branch Network Module
-- Adds Sugg-operated regional offices (sugg_branches) as a
-- management/reporting layer ABOVE partner agencies, the
-- SUGG_BRANCH_MANAGER role, geographic territories, and the
-- agency onboarding recommendation workflow.
--
-- Additive & backward-compatible: all new agency/counselor
-- columns are nullable, approval_status defaults to APPROVED so
-- existing agencies stay active, and no backfill is required.
--
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Enums --------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE "SuggBranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "AgencyApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New role (additive — no existing role changes)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUGG_BRANCH_MANAGER';

-- New notification types for the Sugg Branch workflow
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_AGENCY_IN_TERRITORY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_ASSIGNED_SUGG_BRANCH';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_RECOMMENDATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGENCY_SUSPENSION_RECOMMENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'UNASSIGNED_TERRITORY_AGENCY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TERRITORY_REPORT_READY';

-- 2. sugg_branches ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sugg_branches" (
  "id"          TEXT               NOT NULL DEFAULT gen_random_uuid()::text,
  "branch_name" TEXT               NOT NULL,
  "branch_code" TEXT               NOT NULL,
  "address"     TEXT,
  "country_id"  TEXT               NOT NULL,
  "state_id"    TEXT,
  "district_id" TEXT,
  "phone"       TEXT,
  "email"       TEXT,
  "manager_id"  TEXT,
  "status"      "SuggBranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by"  TEXT,
  "updated_by"  TEXT,
  "created_at"  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT "sugg_branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sugg_branches_branch_name_key" UNIQUE ("branch_name"),
  CONSTRAINT "sugg_branches_branch_code_key" UNIQUE ("branch_code"),
  CONSTRAINT "sugg_branches_manager_id_key" UNIQUE ("manager_id")
);

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branches"
    ADD CONSTRAINT "sugg_branches_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. sugg_branch_territories --------------------------------------------------

CREATE TABLE IF NOT EXISTS "sugg_branch_territories" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "sugg_branch_id" TEXT        NOT NULL,
  "country_id"     TEXT        NOT NULL,
  "state_id"       TEXT,
  "district_id"    TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sugg_branch_territories_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "sugg_branch_territories"
    ADD CONSTRAINT "sugg_branch_territories_sugg_branch_id_fkey" FOREIGN KEY ("sugg_branch_id") REFERENCES "sugg_branches"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branch_territories"
    ADD CONSTRAINT "sugg_branch_territories_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branch_territories"
    ADD CONSTRAINT "sugg_branch_territories_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sugg_branch_territories"
    ADD CONSTRAINT "sugg_branch_territories_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_sugg_branch_territories_geo"
  ON "sugg_branch_territories"("country_id", "state_id", "district_id");
CREATE INDEX IF NOT EXISTS "idx_sugg_branch_territories_branch_id"
  ON "sugg_branch_territories"("sugg_branch_id");

-- 4. platform_settings --------------------------------------------------------

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "key"        TEXT        NOT NULL,
  "value"      TEXT        NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_settings_key_key" UNIQUE ("key")
);

-- Territory-aware lead assignment ships OFF by default.
INSERT INTO "platform_settings" ("id", "key", "value")
VALUES (gen_random_uuid()::text, 'territoryAwareLeadAssignment', 'false')
ON CONFLICT ("key") DO NOTHING;

-- 5. agencies: Sugg Branch link, geo FKs, onboarding workflow -----------------

ALTER TABLE "agencies"
  ADD COLUMN IF NOT EXISTS "sugg_branch_id"      TEXT,
  ADD COLUMN IF NOT EXISTS "country_id"          TEXT,
  ADD COLUMN IF NOT EXISTS "state_id"            TEXT,
  ADD COLUMN IF NOT EXISTS "district_id"         TEXT,
  ADD COLUMN IF NOT EXISTS "approval_status"     "AgencyApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "recommendation_note" TEXT,
  ADD COLUMN IF NOT EXISTS "recommended_by_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "recommended_at"      TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_sugg_branch_id_fkey" FOREIGN KEY ("sugg_branch_id") REFERENCES "sugg_branches"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agencies"
    ADD CONSTRAINT "agencies_recommended_by_id_fkey" FOREIGN KEY ("recommended_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. counselors: Sugg Branch link ---------------------------------------------

ALTER TABLE "counselors"
  ADD COLUMN IF NOT EXISTS "sugg_branch_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "counselors"
    ADD CONSTRAINT "counselors_sugg_branch_id_fkey" FOREIGN KEY ("sugg_branch_id") REFERENCES "sugg_branches"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Indexes for performance --------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_sugg_branches_manager_id"  ON "sugg_branches"("manager_id");
CREATE INDEX IF NOT EXISTS "idx_sugg_branches_status"      ON "sugg_branches"("status");
CREATE INDEX IF NOT EXISTS "idx_agencies_sugg_branch_id"   ON "agencies"("sugg_branch_id");
CREATE INDEX IF NOT EXISTS "idx_agencies_approval_status"  ON "agencies"("approval_status");
CREATE INDEX IF NOT EXISTS "idx_agencies_geo"              ON "agencies"("country_id", "state_id", "district_id");
CREATE INDEX IF NOT EXISTS "idx_counselors_sugg_branch_id" ON "counselors"("sugg_branch_id");

-- Done! Run the seed script after this migration.
