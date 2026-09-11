import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('validation.invalid_email'),
    },
  )
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  email!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MinLength(8, { message: i18nValidationMessage('validation.min_length') })
  password!: string;
}
