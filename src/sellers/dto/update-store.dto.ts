import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsIn(['personal', 'store'])
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  storeName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'storeSlug must contain only lowercase letters, numbers and hyphens',
  })
  @MaxLength(60)
  storeSlug?: string;

  @IsOptional()
  @IsString()
  storeBanner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeWebsite?: string;

  /** Só dígitos com DDI/DDD — o front monta o link wa.me. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'whatsapp deve conter apenas dígitos, com DDD (ex.: 5531999998888)',
  })
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  publicPhone?: string;

  /** CPF ou CNPJ, só dígitos. Necessário para o selo de verificado. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'document deve ser CPF ou CNPJ' })
  document?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;
}
