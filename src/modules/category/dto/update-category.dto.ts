import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  name?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  slug?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  description?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(255, { message: i18nValidationMessage('validation.max_length') })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isActive?: boolean;
}
