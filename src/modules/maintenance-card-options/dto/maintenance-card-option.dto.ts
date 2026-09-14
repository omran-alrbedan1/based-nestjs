import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);
const uppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : (value as unknown);

export class CreateMaintenanceCardOptionDto {
  @ApiProperty()
  @Transform(uppercase)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  code!: string;

  @ApiProperty({ description: 'English label stored in the lookup table.' })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(150, { message: i18nValidationMessage('validation.max_length') })
  labelEn!: string;

  @ApiProperty({ description: 'Arabic label stored in the lookup table.' })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(150, { message: i18nValidationMessage('validation.max_length') })
  labelAr!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  displayOrder!: number;
}

export class UpdateMaintenanceCardOptionDto extends PartialType(CreateMaintenanceCardOptionDto) {}

export class OptionListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isActive?: boolean | string;
}
