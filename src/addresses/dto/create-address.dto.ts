import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @IsString()
  @MinLength(2)
  recipientName: string;

  @IsString()
  @Length(8, 9)
  zipCode: string;

  @IsString()
  @MinLength(2)
  street: string;

  @IsString()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  @MinLength(2)
  district: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
