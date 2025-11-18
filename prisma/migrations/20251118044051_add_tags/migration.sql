-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "family_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_tags" (
    "id" TEXT NOT NULL,
    "income_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "income_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_family_id_name_key" ON "tags"("family_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "income_tags_income_id_tag_id_key" ON "income_tags"("income_id", "tag_id");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_tags" ADD CONSTRAINT "income_tags_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "incomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_tags" ADD CONSTRAINT "income_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
