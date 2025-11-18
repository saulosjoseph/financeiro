-- Add recurring fields to incomes table
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "recurring_type" TEXT;
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "recurring_day" INTEGER;
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "recurring_end_date" TIMESTAMP(3);

-- Add recurring fields to expenses table
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recurring_type" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recurring_day" INTEGER;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "recurring_end_date" TIMESTAMP(3);

-- Create indexes
CREATE INDEX IF NOT EXISTS "incomes_familyId_date_idx" ON "incomes"("family_id", "date");
CREATE INDEX IF NOT EXISTS "incomes_isRecurring_idx" ON "incomes"("is_recurring");
CREATE INDEX IF NOT EXISTS "expenses_familyId_date_idx" ON "expenses"("family_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_isRecurring_idx" ON "expenses"("is_recurring");
