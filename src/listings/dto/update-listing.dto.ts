import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';

export class UpdateListingDto extends PartialType(
  OmitType(CreateListingDto, ['status'] as const),
) {
  /**
   * Publicar (`POST /listings/:id/publish`) e marcar como vendido
   * (`POST /listings/:id/sold`) têm rota própria — passam por cota e
   * curadoria. Aqui só dá para pausar ou voltar para rascunho.
   */
  @IsOptional()
  @IsIn(['paused', 'draft'])
  status?: string;
}
