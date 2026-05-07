import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

type AuthenticatedSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
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

      socket.data.userId = payload.sub;
    } catch {
      socket.disconnect(true);
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
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const userId = this.getSocketUserId(socket);
    const message = await this.chatService.saveMessage(
      data.conversationId,
      userId,
      data.content,
    );

    this.server.to(data.conversationId).emit('newMessage', message);
    return message;
  }

  private getSocketUserId(socket: AuthenticatedSocket) {
    if (!socket.data.userId) {
      throw new WsException('Unauthorized');
    }

    return socket.data.userId;
  }
}
