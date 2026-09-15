import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMediaMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}
