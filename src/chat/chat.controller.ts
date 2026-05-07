import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  findOrCreateConversation(
    @Req() req: AuthenticatedRequest,
    @Body('listingId') listingId: string,
  ) {
    return this.chatService.findOrCreateConversation(
      listingId,
      req.user.userId,
    );
  }

  @Get()
  getConversations(@Req() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.chatService.getMessages(id, req.user.userId);
  }
}
