import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SearchQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  search?: string;
}
