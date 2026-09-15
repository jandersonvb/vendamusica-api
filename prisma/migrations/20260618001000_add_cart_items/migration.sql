CREATE TABLE "public"."CartItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CartItem_userId_listingId_key" ON "public"."CartItem"("userId", "listingId");
CREATE INDEX "CartItem_userId_idx" ON "public"."CartItem"("userId");
CREATE INDEX "CartItem_listingId_idx" ON "public"."CartItem"("listingId");

ALTER TABLE "public"."CartItem"
ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CartItem"
ADD CONSTRAINT "CartItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
