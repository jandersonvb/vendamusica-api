import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

type AuthenticatedSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = socket.handshake.auth?.token;

      if (!token || typeof token !== 'string') {
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token);

      const userId = payload.sub;
      socket.data.userId = userId;

      this.registerSocket(userId, socket.id);

      const conversations = await this.prisma.conversation.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        select: { id: true },
      });

      for (const conversation of conversations) {
        await socket.join(conversation.id);
      }

      socket.broadcast.emit('user:online', { userId });
      await this.chatService.markPendingDelivered(userId);
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const userId = socket.data?.userId;
    if (!userId) {
      return;
    }

    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socket.id);
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      socket.broadcast.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.getSocketUserId(socket);
    await this.chatService.verifyConversationParticipant(
      data.conversationId,
      userId,
    );
    await socket.join(data.conversationId);
    return { joined: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: string; content: string; replyToMessageId?: string },
  ) {
    const userId = this.getSocketUserId(socket);

    if (!data.content?.trim() || data.content.length > 2000) {
      throw new WsException('Invalid message');
    }

    return this.chatService.saveMessage(
      data.conversationId,
      userId,
      data.content,
      data.replyToMessageId,
    );
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.emitTyping(socket, data.conversationId, 'typing:start');
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.emitTyping(socket, data.conversationId, 'typing:stop');
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.getSocketUserId(socket);
    return this.chatService.markRead(data.conversationId, userId);
  }

  @SubscribeMessage('users:online')
  handleGetOnlineUsers(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    this.getSocketUserId(socket);

    return (data.userIds ?? []).map((id) => ({
      userId: id,
      online: this.isUserOnline(id),
    }));
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server.to(conversationId).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      return;
    }

    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  addUserToConversationRoom(userId: string, conversationId: string) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) {
      return;
    }

    for (const socketId of sockets) {
      this.server.in(socketId).socketsJoin(conversationId);
    }
  }

  isUserOnline(userId: string) {
    return this.onlineUsers.has(userId);
  }

  private registerSocket(userId: string, socketId: string) {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId)!.add(socketId);
  }

  private async emitTyping(
    socket: AuthenticatedSocket,
    conversationId: string,
    event: 'typing:start' | 'typing:stop',
  ) {
    if (!conversationId) {
      return;
    }

    const userId = this.getSocketUserId(socket);
    await this.chatService.verifyConversationParticipant(conversationId, userId);
    socket.to(conversationId).emit(event, { conversationId, userId });
  }

  private getSocketUserId(socket: AuthenticatedSocket) {
    if (!socket.data.userId) {
      throw new WsException('Unauthorized');
    }

    return socket.data.userId;
  }
}
