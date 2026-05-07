import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('recipients')
  async createRecipient(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      email: string;
      document: string;
      bankCode: string;
      agency: string;
      account: string;
      accountType: string;
    },
  ) {
    const recipient = await this.paymentsService.createRecipient(body);
    await this.usersService.updateRecipient(req.user.userId, recipient.id);

    return recipient;
  }
}
