-- AlterTable
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "initial_balance" DECIMAL(10,2) NOT NULL DEFAULT 0;
