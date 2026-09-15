import { IsInt, Min } from 'class-validator';

export class CreateOfferDto {
  @IsInt()
  @Min(100)
  amount: number;
}
