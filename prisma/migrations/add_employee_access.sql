-- ============================================================
-- Migration: Employee access (capabilities + login link)
-- Adds per-user capability grants (additive access on top of role) and links
-- an employee HR record to its login user. Additive; backward-compatible.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

-- Per-user capability grants (e.g. 'VIEW_COMMISSIONS'). Empty = role defaults only.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] NOT NULL DEFAULT '{}';

-- Link an employee to the login user provisioned for them.
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "employees_user_id_key" ON "employees"("user_id");

DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Done.
