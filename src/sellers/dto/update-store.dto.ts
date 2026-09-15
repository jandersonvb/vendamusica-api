import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStoreDto {
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
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
