ALTER TABLE "Opportunity"
  ADD COLUMN IF NOT EXISTS "projectName" TEXT,
  ADD COLUMN IF NOT EXISTS "projectClientType" TEXT;

UPDATE "Opportunity"
  SET "projectName" = "title"
  WHERE "projectName" IS NULL;
