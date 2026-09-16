import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectListingDto {
  /** Vai aparecer para o vendedor na tela de "meus anúncios". */
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
