import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentInputDto, ShippingAddressInputDto } from './create-order.dto';

export class UpdatePaymentDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  method?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(10, { message: i18nValidationMessage('validation.max_length') })
  currency?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  transactionId?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  status?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  status?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressInputDto)
  shippingAddress?: ShippingAddressInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentDto)
  payment?: UpdatePaymentDto;
}
