import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autentica se vier token, mas deixa passar quem está deslogado.
 * Usado no registro de contato: o clique no WhatsApp de um anúncio público
 * precisa ser contado mesmo sem login.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { userId: string; email: string }>(
    _error: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user || undefined;
  }
}
