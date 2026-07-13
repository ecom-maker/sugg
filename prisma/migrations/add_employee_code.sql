-- ============================================================
-- Migration: Employee code
-- Adds a system-generated unique code (e.g. SUGG-EMP-0001) to each employee.
-- The employees table is new/empty, so NOT NULL + UNIQUE is safe.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "employee_code" TEXT;

-- Backfill any pre-existing rows deterministically before enforcing NOT NULL.
UPDATE "employees"
SET "employee_code" = 'SUGG-EMP-' || lpad(seq::text, 4, '0')
FROM (
  SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS seq
  FROM "employees"
  WHERE "employee_code" IS NULL
) AS numbered
WHERE "employees"."id" = numbered."id"
  AND "employees"."employee_code" IS NULL;

ALTER TABLE "employees" ALTER COLUMN "employee_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "employees_employee_code_key"
  ON "employees"("employee_code");

-- Done.
