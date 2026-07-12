-- Add the contact person's phone number to colleges. Additive & nullable.
ALTER TABLE "colleges"
  ADD COLUMN IF NOT EXISTS "contact_person_phone" TEXT;
