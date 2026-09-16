import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  /** Centavos. Omitir = "sob consulta" (comum em loja). */
  @IsOptional()
  @IsInt()
  @Min(100)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  comparePrice?: number;

  @IsString()
  category: string;

  @IsIn(['novo', 'seminovo', 'usado'])
  condition: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  includedItems?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  acceptsTrade?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsPickup?: boolean;

  /** Link de vídeo (YouTube). Liberado a partir do plano Pro. */
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @Length(8, 9)
  zipCode?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  district?: string;

  /** O teto real de fotos vem do plano; 20 é o limite absoluto. */
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images: string[];

  @IsString()
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsOptional()
  @IsIn(['active', 'draft'])
  status?: string;
}
