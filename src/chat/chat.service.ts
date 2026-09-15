import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ChatMessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ChatGateway } from './chat.gateway';

const messageInclude = {
  sender: {
    select: { id: true, name: true, avatar: true },
  },
  reactions: {
    select: { userId: true, emoji: true },
  },
  replyTo: {
    select: { id: true, senderId: true, content: true, type: true, deletedAt: true },
  },
} satisfies Prisma.MessageInclude;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async findOrCreateConversation(listingId: string, buyerId: string) {
    const existingConversation = await this.prisma.conversation.findUnique({
      where: {
        listingId_buyerId: {
          listingId,
          buyerId,
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new HttpException('Listing not found', HttpStatus.NOT_FOUND);
    }

    if (listing.sellerId === buyerId) {
      throw new HttpException(
        'Seller cannot start a conversation as buyer',
        HttpStatus.BAD_REQUEST,
      );
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.sellerId,
      },
    });

    this.chatGateway.addUserToConversationRoom(buyerId, conversation.id);
    this.chatGateway.addUserToConversationRoom(
      listing.sellerId,
      conversation.id,
    );

    return conversation;
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        listing: {
          select: { id: true, title: true, images: true, price: true },
        },
        buyer: {
          select: { id: true, name: true, avatar: true },
        },
        seller: {
          select: { id: true, name: true, avatar: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: messageInclude,
        },
        offers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const lastMessageRow = conversation.messages[0] ?? null;
        const myLastReadAt =
          conversation.buyerId === userId
            ? conversation.buyerLastReadAt
            : conversation.sellerLastReadAt;

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
          },
        });

        return {
          ...conversation,
          messages: undefined,
          lastMessage: lastMessageRow
            ? this.formatMessage(lastMessageRow, userId)
            : null,
          lastOffer: conversation.offers[0] ?? null,
          unread: unreadCount > 0,
          unreadCount,
          otherParty:
            conversation.buyerId === userId
              ? conversation.seller
              : conversation.buyer,
          online:
            conversation.buyerId === userId
              ? this.chatGateway.isUserOnline(conversation.sellerId)
              : this.chatGateway.isUserOnline(conversation.buyerId),
        };
      }),
    );
  }

  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    take = 30,
  ) {
    await this.verifyConversationParticipant(conversationId, userId);

    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take,
      orderBy: { createdAt: 'desc' },
      include: messageInclude,
    });

    const messages = rows
      .map((row) => this.formatMessage(row, userId))
      .reverse();

    return {
      messages,
      hasMore: rows.length === take,
      nextCursor: rows.length === take ? rows[rows.length - 1].id : null,
    };
  }

  async saveMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyToMessageId?: string,
  ) {
    const conversation = await this.verifyConversationParticipant(
      conversationId,
      senderId,
    );
    await this.assertReplyBelongsToConversation(conversationId, replyToMessageId);

    const recipientId = this.getRecipientId(conversation, senderId);
    const recipientOnline = this.chatGateway.isUserOnline(recipientId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type: ChatMessageType.TEXT,
        replyToMessageId: replyToMessageId ?? null,
        deliveredAt: recipientOnline ? new Date() : null,
      },
      include: messageInclude,
    });

    return this.afterMessageCreated(conversation, message, recipientId);
  }

  async saveMediaMessage(
    conversationId: string,
    senderId: string,
    file: Express.Multer.File,
    content?: string,
    replyToMessageId?: string,
  ) {
    if (!file) {
      throw new HttpException('Media file is required', HttpStatus.BAD_REQUEST);
    }

    const conversation = await this.verifyConversationParticipant(
      conversationId,
      senderId,
    );
    await this.assertReplyBelongsToConversation(conversationId, replyToMessageId);

    const upload = await this.uploadsService.uploadChatMedia(file);
    const recipientId = this.getRecipientId(conversation, senderId);
    const recipientOnline = this.chatGateway.isUserOnline(recipientId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content?.trim() ?? '',
        type: upload.type as ChatMessageType,
        replyToMessageId: replyToMessageId ?? null,
        deliveredAt: recipientOnline ? new Date() : null,
        mediaUrl: upload.url,
        mediaMimeType: upload.mimeType,
        mediaSize: upload.size,
        mediaFileName: upload.fileName,
      },
      include: messageInclude,
    });

    return this.afterMessageCreated(conversation, message, recipientId);
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    content: string,
  ) {
    const message = await this.getOwnedMessage(conversationId, messageId, userId);

    if (message.deletedAt) {
      throw new HttpException(
        'Cannot edit a deleted message',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), editedAt: new Date() },
      include: messageInclude,
    });

    const payload = this.formatMessage(updated, userId);
    this.chatGateway.emitToConversation(conversationId, 'message:edited', payload);

    return payload;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    forEveryone = false,
  ) {
    const message = await this.getOwnedMessage(conversationId, messageId, userId);

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedForEveryone: forEveryone,
        ...(forEveryone ? { content: '', mediaUrl: null } : {}),
      },
    });

    const payload = {
      conversationId,
      messageId,
      deletedForEveryone: forEveryone,
      deletedBy: userId,
    };
    this.chatGateway.emitToConversation(conversationId, 'message:deleted', payload);

    return payload;
  }

  async reactToMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    await this.getMessageInConversation(conversationId, messageId, userId);

    await this.prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, emoji },
      update: { emoji },
    });

    return this.emitReactions(conversationId, messageId, userId);
  }

  async removeReaction(
    conversationId: string,
    messageId: string,
    userId: string,
  ) {
    await this.getMessageInConversation(conversationId, messageId, userId);

    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId },
    });

    return this.emitReactions(conversationId, messageId, userId);
  }

  async searchMessages(conversationId: string, userId: string, query: string) {
    await this.verifyConversationParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        content: { contains: query.trim(), mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: messageInclude,
    });

    return messages.map((message) => this.formatMessage(message, userId));
  }

  async getUnreadCount(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: {
        id: true,
        buyerId: true,
        buyerLastReadAt: true,
        sellerLastReadAt: true,
      },
    });

    let count = 0;
    await Promise.all(
      conversations.map(async (conversation) => {
        const myLastReadAt =
          conversation.buyerId === userId
            ? conversation.buyerLastReadAt
            : conversation.sellerLastReadAt;

        count += await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
          },
        });
      }),
    );

    return { count };
  }

  /**
   * Marca como entregues todas as mensagens pendentes destinadas ao usuário
   * (chamado quando ele conecta no socket).
   */
  async markPendingDelivered(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { id: true },
    });

    await Promise.all(
      conversations.map(async ({ id }) => {
        const result = await this.prisma.message.updateMany({
          where: { conversationId: id, senderId: { not: userId }, deliveredAt: null },
          data: { deliveredAt: new Date() },
        });

        if (result.count > 0) {
          this.chatGateway.emitToConversation(id, 'message:delivered', {
            conversationId: id,
            deliveredTo: userId,
          });
        }
      }),
    );
  }

  async createOffer(conversationId: string, userId: string, amount: number) {
    await this.verifyConversationParticipant(conversationId, userId);
    await this.expireStaleOffers(conversationId);

    await this.prisma.offer.updateMany({
      where: { conversationId, status: 'pending' },
      data: { status: 'countered' },
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.offer.create({
      data: { conversationId, senderId: userId, amount, expiresAt },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async respondToOffer(
    conversationId: string,
    userId: string,
    offerId: string,
    action: 'accepted' | 'rejected',
  ) {
    await this.verifyConversationParticipant(conversationId, userId);
    await this.expireStaleOffers(conversationId);

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.conversationId !== conversationId) {
      throw new HttpException('Offer not found', HttpStatus.NOT_FOUND);
    }

    if (offer.senderId === userId) {
      throw new HttpException(
        'Cannot respond to your own offer',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (offer.status !== 'pending') {
      throw new HttpException(
        'Offer is no longer pending',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: { status: action },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async listOffers(conversationId: string, userId: string) {
    await this.verifyConversationParticipant(conversationId, userId);
    await this.expireStaleOffers(conversationId);

    return this.prisma.offer.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async markRead(conversationId: string, userId: string) {
    const conversation = await this.verifyConversationParticipant(
      conversationId,
      userId,
    );

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data:
          conversation.buyerId === userId
            ? { buyerLastReadAt: now }
            : { sellerLastReadAt: now },
      }),
      this.prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, readAt: null },
        data: { readAt: now },
      }),
    ]);

    this.chatGateway.emitToConversation(conversationId, 'message:read', {
      conversationId,
      readBy: userId,
      readAt: now,
    });

    return { conversationId, readAt: now };
  }

  private async afterMessageCreated(
    conversation: { id: string; buyerId: string; sellerId: string },
    message: MessageWithRelations,
    recipientId: string,
  ) {
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt },
    });

    this.chatGateway.addUserToConversationRoom(message.senderId, conversation.id);
    this.chatGateway.addUserToConversationRoom(recipientId, conversation.id);

    const payload = this.formatMessage(message, message.senderId);
    this.chatGateway.emitToConversation(conversation.id, 'newMessage', payload);
    this.chatGateway.emitToConversation(conversation.id, 'conversation:updated', {
      conversationId: conversation.id,
      lastMessageAt: message.createdAt,
    });
    this.chatGateway.emitToUser(recipientId, 'conversation:new', {
      conversationId: conversation.id,
    });

    return payload;
  }

  private formatMessage(message: MessageWithRelations, viewerId: string) {
    const deletedForEveryone = message.deletedForEveryone;

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: deletedForEveryone ? '' : message.content,
      type: message.type,
      media:
        message.mediaUrl && !deletedForEveryone
          ? {
              url: message.mediaUrl,
              mimeType: message.mediaMimeType,
              size: message.mediaSize,
              fileName: message.mediaFileName,
            }
          : null,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            senderId: message.replyTo.senderId,
            content: message.replyTo.deletedAt
              ? 'Mensagem removida'
              : message.replyTo.content,
            type: message.replyTo.type,
          }
        : null,
      reactions: this.formatReactions(message.reactions, viewerId),
      senderId: message.senderId,
      sender: message.sender,
      isMine: message.senderId === viewerId,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      deletedForEveryone,
      createdAt: message.createdAt,
    };
  }

  private formatReactions(
    reactions: Array<{ userId: string; emoji: string }>,
    viewerId: string,
  ) {
    const groups = new Map<string, number>();
    const mine = new Set<string>();

    reactions.forEach((reaction) => {
      groups.set(reaction.emoji, (groups.get(reaction.emoji) ?? 0) + 1);
      if (reaction.userId === viewerId) {
        mine.add(reaction.emoji);
      }
    });

    return Array.from(groups.entries()).map(([emoji, count]) => ({
      emoji,
      count,
      mine: mine.has(emoji),
    }));
  }

  private async emitReactions(
    conversationId: string,
    messageId: string,
    viewerId: string,
  ) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { userId: true, emoji: true },
    });

    const payload = {
      conversationId,
      messageId,
      reactions: this.formatReactions(reactions, viewerId),
    };
    this.chatGateway.emitToConversation(conversationId, 'message:reaction', payload);

    return payload;
  }

  private getRecipientId(
    conversation: { buyerId: string; sellerId: string },
    senderId: string,
  ) {
    return conversation.buyerId === senderId
      ? conversation.sellerId
      : conversation.buyerId;
  }

  private async assertReplyBelongsToConversation(
    conversationId: string,
    replyToMessageId?: string,
  ) {
    if (!replyToMessageId) {
      return;
    }

    const reply = await this.prisma.message.findUnique({
      where: { id: replyToMessageId },
      select: { conversationId: true },
    });

    if (!reply || reply.conversationId !== conversationId) {
      throw new HttpException(
        'Reply message does not belong to this conversation',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getMessageInConversation(
    conversationId: string,
    messageId: string,
    userId: string,
  ) {
    await this.verifyConversationParticipant(conversationId, userId);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }

    return message;
  }

  private async getOwnedMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ) {
    const message = await this.getMessageInConversation(
      conversationId,
      messageId,
      userId,
    );

    if (message.senderId !== userId) {
      throw new HttpException(
        'Only the author can modify this message',
        HttpStatus.FORBIDDEN,
      );
    }

    return message;
  }

  private expireStaleOffers(conversationId: string) {
    return this.prisma.offer.updateMany({
      where: {
        conversationId,
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
  }

  async verifyConversationParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return conversation;
  }
}
