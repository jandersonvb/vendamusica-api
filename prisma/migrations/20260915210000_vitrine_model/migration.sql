-- DropForeignKey
ALTER TABLE "public"."Address" DROP CONSTRAINT "Address_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_sellerId_fkey";

-- AlterTable
ALTER TABLE "public"."Listing" DROP COLUMN "installments",
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "price" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "asaasWalletId",
DROP COLUMN "bankDataCompleted",
DROP COLUMN "recipientStatus",
ADD COLUMN     "accountType" TEXT NOT NULL DEFAULT 'personal',
ADD COLUMN     "document" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicPhone" TEXT,
ADD COLUMN     "searchPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storeAddress" TEXT,
ADD COLUMN     "storeHours" TEXT,
ADD COLUMN     "storeWebsite" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- DropTable
DROP TABLE "public"."Address";

-- DropTable
DROP TABLE "public"."CartItem";

-- DropTable
DROP TABLE "public"."Coupon";

-- DropTable
DROP TABLE "public"."Order";

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "listingLimit" INTEGER,
    "photoLimit" INTEGER NOT NULL DEFAULT 8,
    "allowsVideo" BOOLEAN NOT NULL DEFAULT false,
    "highlightHome" BOOLEAN NOT NULL DEFAULT false,
    "seesWantedList" BOOLEAN NOT NULL DEFAULT false,
    "searchPriority" INTEGER NOT NULL DEFAULT 0,
    "audience" TEXT NOT NULL DEFAULT 'both',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WantedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "maxPrice" INTEGER,
    "condition" TEXT,
    "city" TEXT,
    "state" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WantedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WantedMatch" (
    "id" TEXT NOT NULL,
    "wantedItemId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WantedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingId" TEXT,
    "visitorId" TEXT,
    "channel" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "public"."Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "public"."Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "public"."Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE INDEX "WantedItem_userId_idx" ON "public"."WantedItem"("userId");

-- CreateIndex
CREATE INDEX "WantedItem_category_idx" ON "public"."WantedItem"("category");

-- CreateIndex
CREATE INDEX "WantedItem_status_idx" ON "public"."WantedItem"("status");

-- CreateIndex
CREATE INDEX "WantedMatch_listingId_idx" ON "public"."WantedMatch"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "WantedMatch_wantedItemId_listingId_key" ON "public"."WantedMatch"("wantedItemId", "listingId");

-- CreateIndex
CREATE INDEX "Lead_sellerId_createdAt_idx" ON "public"."Lead"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_listingId_idx" ON "public"."Lead"("listingId");

-- CreateIndex
CREATE INDEX "Lead_channel_idx" ON "public"."Lead"("channel");

-- CreateIndex
CREATE INDEX "Report_listingId_idx" ON "public"."Report"("listingId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "public"."Report"("status");

-- CreateIndex
CREATE INDEX "Listing_isFeatured_idx" ON "public"."Listing"("isFeatured");

-- CreateIndex
CREATE INDEX "Listing_city_state_idx" ON "public"."Listing"("city", "state");

-- CreateIndex
CREATE INDEX "User_accountType_idx" ON "public"."User"("accountType");

-- CreateIndex
CREATE INDEX "User_storeSlug_idx" ON "public"."User"("storeSlug");

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WantedItem" ADD CONSTRAINT "WantedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WantedMatch" ADD CONSTRAINT "WantedMatch_wantedItemId_fkey" FOREIGN KEY ("wantedItemId") REFERENCES "public"."WantedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WantedMatch" ADD CONSTRAINT "WantedMatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

