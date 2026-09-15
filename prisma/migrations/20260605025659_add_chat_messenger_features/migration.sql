-- CreateEnum
CREATE TYPE "public"."ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'FILE');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedForEveryone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "mediaFileName" TEXT,
ADD COLUMN     "mediaMimeType" TEXT,
ADD COLUMN     "mediaSize" INTEGER,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "replyToMessageId" TEXT,
ADD COLUMN     "type" "public"."ChatMessageType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "public"."MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "public"."MessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "MessageReaction_userId_idx" ON "public"."MessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "public"."MessageReaction"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "public"."Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "public"."Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "public"."Message"("replyToMessageId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
