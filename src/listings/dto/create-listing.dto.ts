import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Length,
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

  @IsInt()
  @Min(100)
  price: number;

  @IsString()
  category: string;

  @IsIn(['novo', 'seminovo', 'usado'])
  condition: string;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images: string[];

  @IsString()
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;
}
