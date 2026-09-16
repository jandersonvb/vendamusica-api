import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Usar sempre depois do JwtAuthGuard: confia no req.user já preenchido. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { userId: string } }>();

    if (!request.user?.userId) {
      throw new ForbiddenException('Acesso restrito');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}
