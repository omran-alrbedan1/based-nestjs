import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  name?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  description?: string;

  @Transform(({ value }) =>
    typeof value === 'number' ? value.toFixed(2) : typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: i18nValidationMessage('validation.invalid_price'),
  })
  price?: string;

  @Transform(({ value }) => (typeof value === 'string' ? Number.parseInt(value, 10) : value))
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  stock?: number;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  sku?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  categoryId?: string;
}
