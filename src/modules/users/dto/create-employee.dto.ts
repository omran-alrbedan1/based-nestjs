import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

export class CreateEmployeeDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MaxLength(100, { message: i18nValidationMessage('validation.max_length') })
  lastName!: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(trim)
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsEmail({}, { message: i18nValidationMessage('validation.invalid_email') })
  @MaxLength(254, { message: i18nValidationMessage('validation.max_length') })
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MinLength(8, { message: i18nValidationMessage('validation.min_length') })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: i18nValidationMessage('validation.strong_password'),
  })
  password!: string;
}