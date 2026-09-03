import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdatePasswordDto {
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  currentPassword!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @MinLength(8, { message: i18nValidationMessage('validation.min_length') })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: i18nValidationMessage('validation.strong_password'),
  })
  newPassword!: string;
}
