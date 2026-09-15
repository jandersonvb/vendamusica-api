import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
  ) {}

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
    await this.usersService.updateRecipient(
      req.user.userId,
      recipient.id,
      recipient.status,
    );

    return recipient;
  }

  /** Status do KYC + saldo do vendedor logado (dashboard do vendedor). */
  @Get('recipients/me')
  async myRecipient(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.userId);

    if (!user.asaasWalletId) {
      return { connected: false, status: null, balance: null };
    }

    // Busca status atualizado no gateway e sincroniza localmente.
    const recipient = await this.paymentsService.getRecipient(
      user.asaasWalletId,
    );
    await this.usersService.updateRecipientStatus(
      user.asaasWalletId,
      recipient.status,
    );

    const balance = await this.paymentsService.getBalance(
      user.asaasWalletId,
    );

    return {
      connected: true,
      status: recipient.status,
      kycUrl: recipient.kycUrl,
      balance,
    };
  }
}
