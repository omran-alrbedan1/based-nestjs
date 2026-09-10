import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GlobalSearchQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'RP-1001' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MinLength(2, { message: i18nValidationMessage('validation.min_length') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  q!: string;
}
