import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';

export class OrderListQueryDto extends BaseListQueryDto {
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  status?: string;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  userId?: string;
}
