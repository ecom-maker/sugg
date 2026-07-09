-- Fix missing schema objects (idempotent, PostgreSQL-safe)
-- Run when db push / partial migrations left tables missing

DO $$ BEGIN CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "AssignmentStrategy" AS ENUM ('ROUND_ROBIN', 'MANUAL', 'COURSE_BASED', 'BRANCH_BASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "agency_branches" (
  "id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "branch_name" TEXT NOT NULL,
  "branch_code" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT,
  "postal_code" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "manager_id" TEXT,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "country_id" TEXT,
  "state_id" TEXT,
  "district_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "agency_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_branches_branch_code_key" ON "agency_branches"("branch_code");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_branches_manager_id_key" ON "agency_branches"("manager_id") WHERE "manager_id" IS NOT NULL;

ALTER TABLE "agency_users" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "agency_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "country_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "district_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mobile_number_normalized" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_anonymized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "merged_into_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "is_current" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "commission_type" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "commission_value" DECIMAL(10,4);
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "commission_currency" TEXT DEFAULT 'INR';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "commission_rules" JSONB;

ALTER TABLE "colleges" ADD COLUMN IF NOT EXISTS "university_id" TEXT;
ALTER TABLE "colleges" ADD COLUMN IF NOT EXISTS "country_id" TEXT;
ALTER TABLE "colleges" ADD COLUMN IF NOT EXISTS "state_id" TEXT;
ALTER TABLE "colleges" ADD COLUMN IF NOT EXISTS "district_id" TEXT;

ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "registration_number" TEXT;
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "headquarters" TEXT;
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "assignment_strategy" "AssignmentStrategy" DEFAULT 'ROUND_ROBIN';

CREATE TABLE IF NOT EXISTS "branch_targets" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "lead_target" INTEGER NOT NULL DEFAULT 0,
  "admission_target" INTEGER NOT NULL DEFAULT 0,
  "revenue_target" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "branch_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "branch_targets_branch_id_month_year_key" ON "branch_targets"("branch_id", "month", "year");

CREATE TABLE IF NOT EXISTS "branch_reports" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "report_date" TIMESTAMPTZ NOT NULL,
  "admissions" INTEGER NOT NULL DEFAULT 0,
  "leads" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "commissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "branch_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "team_id" TEXT NOT NULL,
  "counselor_id" TEXT NOT NULL,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
