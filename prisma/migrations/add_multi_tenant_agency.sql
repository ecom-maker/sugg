-- ============================================================
-- Migration: Multi-Tenant Agency Management System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new enum values
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AGENCY_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BRANCH_MANAGER';

-- 2. Create BranchStatus enum
DO $$ BEGIN
  CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create AssignmentStrategy enum
DO $$ BEGIN
  CREATE TYPE "AssignmentStrategy" AS ENUM ('ROUND_ROBIN', 'MANUAL', 'COURSE_BASED', 'BRANCH_BASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Update agencies table
ALTER TABLE "agencies"
  ADD COLUMN IF NOT EXISTS "owner_id" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "headquarters" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "assignment_strategy" "AssignmentStrategy" NOT NULL DEFAULT 'ROUND_ROBIN';

-- Migrate adminId -> ownerId (keep old data)
UPDATE "agencies" SET "owner_id" = "admin_id" WHERE "owner_id" IS NULL AND "admin_id" IS NOT NULL;

-- 5. Create agency_branches table
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
  "manager_id" TEXT UNIQUE,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agency_branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agency_branches_branch_code_key" UNIQUE ("branch_code"),
  CONSTRAINT "agency_branches_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE,
  CONSTRAINT "agency_branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- 6. Create branch_targets table
CREATE TABLE IF NOT EXISTS "branch_targets" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "lead_target" INTEGER NOT NULL DEFAULT 0,
  "admission_target" INTEGER NOT NULL DEFAULT 0,
  "revenue_target" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_targets_branch_id_month_year_key" UNIQUE ("branch_id", "month", "year"),
  CONSTRAINT "branch_targets_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE CASCADE
);

-- 7. Create branch_reports table
CREATE TABLE IF NOT EXISTS "branch_reports" (
  "id" TEXT NOT NULL,
  "branch_id" TEXT NOT NULL,
  "report_date" TIMESTAMP(3) NOT NULL,
  "admissions" INTEGER NOT NULL DEFAULT 0,
  "leads" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "commissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_reports_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE CASCADE
);

-- 8. Update agency_users table - add branch_id
ALTER TABLE "agency_users"
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT,
  ADD CONSTRAINT "agency_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;

-- 9. Update students table
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "agency_id" TEXT,
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

ALTER TABLE "students"
  ADD CONSTRAINT IF NOT EXISTS "students_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL;
ALTER TABLE "students"
  ADD CONSTRAINT IF NOT EXISTS "students_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;

-- 10. Update leads table
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

ALTER TABLE "leads"
  ADD CONSTRAINT IF NOT EXISTS "leads_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;

-- 11. Update applications table
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

ALTER TABLE "applications"
  ADD CONSTRAINT IF NOT EXISTS "applications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;

-- 12. Update commission_transactions table
ALTER TABLE "commission_transactions"
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT,
  ADD COLUMN IF NOT EXISTS "counselor_id" TEXT;

ALTER TABLE "commission_transactions"
  ADD CONSTRAINT IF NOT EXISTS "commission_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;
ALTER TABLE "commission_transactions"
  ADD CONSTRAINT IF NOT EXISTS "commission_transactions_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- 13. Update commission_payouts table
ALTER TABLE "commission_payouts"
  ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

ALTER TABLE "commission_payouts"
  ADD CONSTRAINT IF NOT EXISTS "commission_payouts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_agency_branches_agency_id" ON "agency_branches"("agency_id");
CREATE INDEX IF NOT EXISTS "idx_agency_users_branch_id" ON "agency_users"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_students_agency_id" ON "students"("agency_id");
CREATE INDEX IF NOT EXISTS "idx_students_branch_id" ON "students"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_leads_branch_id" ON "leads"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_applications_branch_id" ON "applications"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_commission_transactions_branch_id" ON "commission_transactions"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_commission_transactions_counselor_id" ON "commission_transactions"("counselor_id");

-- Done! Run seed script after this migration.
