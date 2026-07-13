-- ============================================================
-- Migration: Repoint employee branch link to Sugg Branches
-- Employees are Sugg operations staff, so their branch is a Sugg Branch
-- (sugg_branches), not an agency branch. Additive/idempotent.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

-- Drop the old FK to agency_branches.
DO $$ BEGIN
  ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_branch_id_fkey";
EXCEPTION WHEN undefined_object THEN null; END $$;

-- Any existing branch_id referenced an agency branch; clear so the new FK holds.
UPDATE "employees" SET "branch_id" = NULL WHERE "branch_id" IS NOT NULL;

-- Repoint to sugg_branches.
DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "sugg_branches"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Done.
