import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'golpe',
  'produto_proibido',
  'anuncio_duplicado',
  'preco_enganoso',
  'ja_vendido',
  'outro',
];

export class CreateReportDto {
  @IsIn(REPORT_REASONS)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
