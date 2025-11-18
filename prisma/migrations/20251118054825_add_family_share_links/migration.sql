-- CreateTable
CREATE TABLE "family_share_links" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_by" TEXT NOT NULL,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_share_links_token_key" ON "family_share_links"("token");

-- CreateIndex
CREATE INDEX "family_share_links_token_idx" ON "family_share_links"("token");

-- AddForeignKey
ALTER TABLE "family_share_links" ADD CONSTRAINT "family_share_links_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
