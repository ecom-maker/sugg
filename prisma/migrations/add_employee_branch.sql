-- ============================================================
-- Migration: Employee branch link
-- Ties an employee to an agency branch so a Branch Manager can manage the
-- employees in their own branch. Additive; backward-compatible.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_employees_branch" ON "employees"("branch_id");

DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Done.
