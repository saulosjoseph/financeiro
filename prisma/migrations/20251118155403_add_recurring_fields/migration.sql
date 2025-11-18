-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_day" INTEGER,
ADD COLUMN     "recurring_end_date" TIMESTAMP(3),
ADD COLUMN     "recurring_type" TEXT;

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurring_day" INTEGER,
ADD COLUMN     "recurring_end_date" TIMESTAMP(3),
ADD COLUMN     "recurring_type" TEXT;

-- CreateIndex
CREATE INDEX "expenses_family_id_date_idx" ON "expenses"("family_id", "date");

-- CreateIndex
CREATE INDEX "expenses_is_recurring_idx" ON "expenses"("is_recurring");

-- CreateIndex
CREATE INDEX "incomes_family_id_date_idx" ON "incomes"("family_id", "date");

-- CreateIndex
CREATE INDEX "incomes_is_recurring_idx" ON "incomes"("is_recurring");
