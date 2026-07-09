-- ============================================================
-- Migration: Course-Level Agency Commission Configuration
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "commission_type"     "CommissionType",
  ADD COLUMN IF NOT EXISTS "commission_value"    DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "commission_currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "commission_rules"    JSONB;

-- Index for fast lookups when calculating commission
CREATE INDEX IF NOT EXISTS "idx_courses_commission_type" ON "courses"("commission_type") WHERE "commission_type" IS NOT NULL;
