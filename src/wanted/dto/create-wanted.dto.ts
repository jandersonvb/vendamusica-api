import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWantedDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  /** Teto de preço em centavos. */
  @IsOptional()
  @IsInt()
  @Min(100)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['novo', 'seminovo', 'usado'])
  condition?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
