import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const LEAD_CHANNELS = [
  'whatsapp',
  'phone',
  'chat',
  'email',
  'store_page',
  'wanted',
];

export class CreateLeadDto {
  @IsOptional()
  @IsUUID()
  listingId?: string;

  /** Obrigatório quando o contato parte da página da loja (sem anúncio). */
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsIn(LEAD_CHANNELS)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
