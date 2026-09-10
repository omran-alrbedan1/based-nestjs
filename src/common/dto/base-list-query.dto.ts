import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from './pagination-query.dto';

export class BaseListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  search?: string;
}

export interface NormalizedListQueryParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
}
