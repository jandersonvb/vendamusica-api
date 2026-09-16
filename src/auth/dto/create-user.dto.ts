import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  /** personal = pessoa física · store = loja (define planos e vitrine). */
  @IsOptional()
  @IsIn(['personal', 'store'])
  accountType?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  /** Canal principal de contato da vitrine. Só dígitos, com DDD. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'whatsapp deve conter apenas dígitos, com DDD (ex.: 5531999998888)',
  })
  whatsapp?: string;
}
