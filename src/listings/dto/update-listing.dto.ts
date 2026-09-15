import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';

export class UpdateListingDto extends PartialType(
  OmitType(CreateListingDto, ['status'] as const),
) {
  @IsOptional()
  @IsIn(['active', 'paused', 'sold', 'draft'])
  status?: string;
}
