-- ============================================================
-- Migration: Lead → Sugg Branch link
-- Lets a Sugg Branch add its own leads (not routed through an agency), scoped
-- to the branch. Additive/idempotent.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sugg_branch_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_leads_sugg_branch" ON "leads"("sugg_branch_id");

DO $$ BEGIN
  ALTER TABLE "leads"
    ADD CONSTRAINT "leads_sugg_branch_id_fkey"
    FOREIGN KEY ("sugg_branch_id") REFERENCES "sugg_branches"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Done.
