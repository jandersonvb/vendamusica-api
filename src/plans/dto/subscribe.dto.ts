import { IsString, Matches } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  planSlug: string;
}
