import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';

function parseBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value as unknown;
}

export class CustomerListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional()
  @Transform(parseBoolean)
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isActive?: boolean;
}
