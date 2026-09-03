import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateOrderItemDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  productId!: string;

  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  quantity!: number;
}

export class ShippingAddressInputDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  addressLine1!: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  addressLine2?: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  city!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  state!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(30, { message: i18nValidationMessage('validation.max_length') })
  postalCode!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  country!: string;
}

export class PaymentInputDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  method!: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(10, { message: i18nValidationMessage('validation.max_length') })
  currency?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  transactionId?: string;
}

export class CreateOrderDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  cartId!: string;

  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayMinSize(1, { message: i18nValidationMessage('validation.array_min_size') })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressInputDto)
  shippingAddress?: ShippingAddressInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInputDto)
  payment?: PaymentInputDto;
}
