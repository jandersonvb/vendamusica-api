ALTER TABLE "public"."User" RENAME COLUMN "pagarmeRecipientId" TO "asaasWalletId";

ALTER INDEX "public"."Order_pagarmeOrderId_key" RENAME TO "Order_gatewayPaymentId_key";
ALTER TABLE "public"."Order" RENAME COLUMN "pagarmeOrderId" TO "gatewayPaymentId";
