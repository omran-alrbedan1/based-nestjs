import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Role } from 'generated/prisma/client';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';
import { i18nValidationMessage } from 'nestjs-i18n';

function parseBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value as unknown;
}

export class UserListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional()
  @Transform(parseBoolean)
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isActive?: boolean;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: i18nValidationMessage('validation.is_enum') })
  role?: Role;
}
