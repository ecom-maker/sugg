-- ============================================================
-- Migration: HR — Employees
-- A directory of Sugg operations staff (branch managers, counsellors,
-- office assistants, drivers, etc.). Additive; backward-compatible.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "EmployeeType" AS ENUM (
    'BRANCH_MANAGER', 'ASST_BRANCH_MANAGER', 'TEAM_LEADER',
    'COUNSELLOR', 'OFFICE_ASSISTANT', 'DRIVER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeIdType" AS ENUM (
    'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'PAN', 'VOTERS_ID'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "employees" (
  "id"                 TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "first_name"         TEXT             NOT NULL,
  "last_name"          TEXT             NOT NULL,
  "dob"                DATE,
  "address"            TEXT,
  "personal_phone"     TEXT,
  "official_phone"     TEXT,
  "personal_email"     TEXT,
  "official_email"     TEXT,
  "emergency_name"     TEXT,
  "emergency_relation" TEXT,
  "emergency_phone"    TEXT,
  "national_id_type"   "EmployeeIdType",
  "national_id_number" TEXT,
  "employee_type"      "EmployeeType"   NOT NULL,
  "is_active"          BOOLEAN          NOT NULL DEFAULT true,
  "created_at"         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_employees_type" ON "employees"("employee_type");
CREATE INDEX IF NOT EXISTS "idx_employees_last_name" ON "employees"("last_name");

-- Done.
