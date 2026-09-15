import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const SHIPPING_METHODS = ['standard', 'express', 'pickup'] as const;
export const PAYMENT_METHODS = [
  'pix',
  'credit_card',
  'boleto',
  'pix_installments',
] as const;

export class CheckoutPreviewDto {
  @IsString()
  listingId: string;

  @IsOptional()
  @IsIn(SHIPPING_METHODS)
  shippingMethod?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CheckoutDto {
  @IsString()
  listingId: string;

  @IsString()
  addressId: string;

  @IsIn(SHIPPING_METHODS)
  shippingMethod: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  listingId: string;
}
