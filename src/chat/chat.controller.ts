import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMediaMessageDto } from './dto/send-media-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { ReactMessageDto } from './dto/react-message.dto';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  findOrCreateConversation(
    @Req() req: AuthenticatedRequest,
    @Body('listingId') listingId: string,
  ) {
    return this.chatService.findOrCreateConversation(listingId, req.user.userId);
  }

  @Get()
  getConversations(@Req() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('unread/count')
  getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.chatService.getMessages(
      id,
      req.user.userId,
      cursor,
      take ? Number(take) : 30,
    );
  }

  @Get(':id/messages/search')
  searchMessages(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('q') q?: string,
  ) {
    if (!q?.trim()) {
      throw new BadRequestException('Parâmetro q é obrigatório.');
    }

    return this.chatService.searchMessages(id, req.user.userId, q);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.saveMessage(
      id,
      req.user.userId,
      dto.content,
      dto.replyToMessageId,
    );
  }

  @Post(':id/media')
  @UseInterceptors(FileInterceptor('file'))
  sendMediaMessage(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendMediaMessageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de mídia é obrigatório.');
    }

    return this.chatService.saveMediaMessage(
      id,
      req.user.userId,
      file,
      dto.content,
      dto.replyToMessageId,
    );
  }

  @Patch(':id/messages/:messageId')
  editMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(
      id,
      messageId,
      req.user.userId,
      dto.content,
    );
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteMessageDto,
  ) {
    return this.chatService.deleteMessage(
      id,
      messageId,
      req.user.userId,
      dto.forEveryone ?? false,
    );
  }

  @Post(':id/messages/:messageId/reactions')
  reactMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chatService.reactToMessage(
      id,
      messageId,
      req.user.userId,
      dto.emoji,
    );
  }

  @Delete(':id/messages/:messageId/reactions')
  removeReaction(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.removeReaction(id, messageId, req.user.userId);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.chatService.markRead(id, req.user.userId);
  }

  @Get(':id/offers')
  getOffers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.chatService.listOffers(id, req.user.userId);
  }

  @Post(':id/offers')
  async createOffer(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOfferDto,
  ) {
    const offer = await this.chatService.createOffer(
      id,
      req.user.userId,
      dto.amount,
    );
    this.chatGateway.emitToConversation(id, 'newOffer', offer);
    return offer;
  }

  @Post(':id/offers/:offerId/accept')
  async acceptOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const offer = await this.chatService.respondToOffer(
      id,
      req.user.userId,
      offerId,
      'accepted',
    );
    this.chatGateway.emitToConversation(id, 'offerUpdate', offer);
    return offer;
  }

  @Post(':id/offers/:offerId/reject')
  async rejectOffer(
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const offer = await this.chatService.respondToOffer(
      id,
      req.user.userId,
      offerId,
      'rejected',
    );
    this.chatGateway.emitToConversation(id, 'offerUpdate', offer);
    return offer;
  }
}
