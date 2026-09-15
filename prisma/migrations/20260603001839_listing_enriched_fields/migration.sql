-- AlterTable
ALTER TABLE "public"."Listing" ADD COLUMN     "acceptsTrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowsPickup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "comparePrice" INTEGER,
ADD COLUMN     "includedItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "installments" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "year" INTEGER,
ADD COLUMN     "zipCode" TEXT;

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "public"."Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "public"."Listing"("category");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "public"."Listing"("status");
