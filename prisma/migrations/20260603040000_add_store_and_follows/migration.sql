-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "followersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storeBanner" TEXT,
ADD COLUMN     "storeName" TEXT,
ADD COLUMN     "storeSlug" TEXT;

-- CreateTable
CREATE TABLE "public"."Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_sellerId_idx" ON "public"."Follow"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_sellerId_key" ON "public"."Follow"("followerId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_storeSlug_key" ON "public"."User"("storeSlug");

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
