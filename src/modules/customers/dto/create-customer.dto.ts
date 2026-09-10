import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);
const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown);

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ahmad Saleh', maxLength: 150 })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(150, { message: i18nValidationMessage('validation.max_length') })
  name!: string;

  @ApiProperty({ example: '+962790000000', maxLength: 30 })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(30, { message: i18nValidationMessage('validation.max_length') })
  phone!: string;

  @ApiPropertyOptional({ example: 'customer@example.com', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.invalid_email') })
  @MaxLength(254, { message: i18nValidationMessage('validation.max_length') })
  email?: string;
}
