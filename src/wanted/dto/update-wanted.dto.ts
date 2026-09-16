import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateWantedDto } from './create-wanted.dto';

export class UpdateWantedDto extends PartialType(CreateWantedDto) {
  @IsOptional()
  @IsIn(['active', 'fulfilled', 'archived'])
  status?: string;
}
