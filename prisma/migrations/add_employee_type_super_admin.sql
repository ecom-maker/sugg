-- ============================================================
-- Migration: Employee type "Super Admin"
-- Adds a SUPER_ADMIN employee job title. When provisioned a login, such an
-- employee gets the SUPER_ADMIN auth role (full portal access).
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TYPE "EmployeeType" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Done.
