import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MaintenanceCardStatus } from 'generated/prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';

export class MaintenanceCardListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceCardStatus })
  @IsOptional()
  @IsEnum(MaintenanceCardStatus, { message: i18nValidationMessage('validation.is_enum') })
  status?: MaintenanceCardStatus;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  customerId?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  vehicleId?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  receivedFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  receivedTo?: string;
}
