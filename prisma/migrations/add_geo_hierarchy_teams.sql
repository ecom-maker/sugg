-- ============================================================
-- Migration: Geographic Hierarchy & Team Management
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Enums
DO $$ BEGIN CREATE TYPE "GeoStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "TeamMemberStatus" AS ENUM ('ACTIVE', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Geographic tables
CREATE TABLE IF NOT EXISTS "countries" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "country_name" TEXT        NOT NULL,
  "country_code" TEXT        NOT NULL,
  "status"       "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "countries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "countries_country_name_key" UNIQUE ("country_name"),
  CONSTRAINT "countries_country_code_key" UNIQUE ("country_code")
);

CREATE TABLE IF NOT EXISTS "states" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "country_id" TEXT        NOT NULL,
  "state_name" TEXT        NOT NULL,
  "state_code" TEXT,
  "status"     "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE,
  CONSTRAINT "states_country_id_state_name_key" UNIQUE ("country_id", "state_name")
);

CREATE TABLE IF NOT EXISTS "districts" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "state_id"      TEXT        NOT NULL,
  "district_name" TEXT        NOT NULL,
  "status"        "GeoStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "districts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "districts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE,
  CONSTRAINT "districts_state_id_district_name_key" UNIQUE ("state_id", "district_name")
);

-- 3. Teams
CREATE TABLE IF NOT EXISTS "teams" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "team_name"    TEXT         NOT NULL,
  "district_id"  TEXT         NOT NULL,
  "branch_id"    TEXT         NOT NULL,
  "team_lead_id" TEXT,
  "status"       "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
  "needs_review" BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_by"   TEXT,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teams_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT,
  CONSTRAINT "teams_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "agency_branches"("id") ON DELETE CASCADE,
  CONSTRAINT "teams_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "agency_users"("id") ON DELETE SET NULL,
  CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id"           TEXT               NOT NULL DEFAULT gen_random_uuid()::text,
  "team_id"      TEXT               NOT NULL,
  "counselor_id" TEXT               NOT NULL,
  "joined_at"    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "status"       "TeamMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "team_members_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "agency_users"("id") ON DELETE CASCADE,
  CONSTRAINT "team_members_team_id_counselor_id_key" UNIQUE ("team_id", "counselor_id")
);

-- 4. Add geo FKs to existing tables (nullable, legacy text fields preserved)
ALTER TABLE "agency_branches"
  ADD COLUMN IF NOT EXISTS "country_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "state_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "district_id" TEXT;

ALTER TABLE "colleges"
  ADD COLUMN IF NOT EXISTS "country_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "state_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "district_id" TEXT;

ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "country_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "state_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "district_id" TEXT;

-- FK constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE "agency_branches" ADD CONSTRAINT "agency_branches_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agency_branches" ADD CONSTRAINT "agency_branches_state_id_fkey"
    FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "agency_branches" ADD CONSTRAINT "agency_branches_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "colleges" ADD CONSTRAINT "colleges_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "colleges" ADD CONSTRAINT "colleges_state_id_fkey"
    FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "colleges" ADD CONSTRAINT "colleges_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "students" ADD CONSTRAINT "students_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "students" ADD CONSTRAINT "students_state_id_fkey"
    FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "students" ADD CONSTRAINT "students_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS "idx_states_country" ON "states"("country_id");
CREATE INDEX IF NOT EXISTS "idx_districts_state" ON "districts"("state_id");
CREATE INDEX IF NOT EXISTS "idx_teams_branch" ON "teams"("branch_id");
CREATE INDEX IF NOT EXISTS "idx_teams_district" ON "teams"("district_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_counselor" ON "team_members"("counselor_id") WHERE "status" = 'ACTIVE';
CREATE INDEX IF NOT EXISTS "idx_branches_geo" ON "agency_branches"("country_id", "state_id", "district_id");

-- 6. Best-effort geo matching for existing branches (India)
-- Match country by text
UPDATE "agency_branches" b
SET "country_id" = c.id
FROM "countries" c
WHERE b."country_id" IS NULL
  AND LOWER(b."country") IN ('india', 'in')
  AND c."country_code" = 'IN';

UPDATE "agency_branches" b
SET "country_id" = c.id
FROM "countries" c
WHERE b."country_id" IS NULL
  AND LOWER(b."country") IN ('uae', 'united arab emirates', 'ae')
  AND c."country_code" = 'AE';

-- Match state (India)
UPDATE "agency_branches" b
SET "state_id" = s.id
FROM "states" s
JOIN "countries" c ON c.id = s."country_id"
WHERE b."state_id" IS NULL
  AND b."country_id" = c.id
  AND LOWER(b."state") = LOWER(s."state_name");

-- Match district by city name (best-effort)
UPDATE "agency_branches" b
SET "district_id" = d.id
FROM "districts" d
JOIN "states" s ON s.id = d."state_id"
WHERE b."district_id" IS NULL
  AND b."state_id" = s.id
  AND LOWER(b."city") = LOWER(d."district_name");

-- Flag unmatched branches (optional review column via NULL geo - no extra column needed)
