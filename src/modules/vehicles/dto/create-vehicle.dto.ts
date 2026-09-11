import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransmissionType } from 'generated/prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);
const uppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : (value as unknown);

export class CreateVehicleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  customerId!: number;

  @ApiProperty({ example: 'Toyota' })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  make!: string;

  @ApiProperty({ example: 'Corolla' })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  model!: string;

  @ApiProperty({ example: 2022 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1886, { message: i18nValidationMessage('validation.min') })
  @Max(new Date().getUTCFullYear() + 1, {
    message: i18nValidationMessage('validation.max'),
  })
  manufactureYear!: number;

  @ApiProperty({ example: '12-34567' })
  @Transform(uppercase)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(30, { message: i18nValidationMessage('validation.max_length') })
  plateNumber!: string;

  @ApiPropertyOptional({ example: 'JTDBR32E720123456' })
  @Transform(uppercase)
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @Length(17, 17, { message: i18nValidationMessage('validation.length') })
  vin?: string;

  @ApiPropertyOptional({ example: 'White' })
  @Transform(trim)
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(50, { message: i18nValidationMessage('validation.max_length') })
  color?: string;

  @ApiProperty({ enum: TransmissionType })
  @IsEnum(TransmissionType, { message: i18nValidationMessage('validation.is_enum') })
  transmission!: TransmissionType;
}
