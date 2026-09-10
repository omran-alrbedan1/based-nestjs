import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MaintenanceCardStatus } from 'generated/prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';

export class MaintenanceCardListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceCardStatus })
  @IsOptional()
  @IsEnum(MaintenanceCardStatus, { message: i18nValidationMessage('validation.is_enum') })
  status?: MaintenanceCardStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('validation.is_uuid') })
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: i18nValidationMessage('validation.is_uuid') })
  vehicleId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  receivedFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  receivedTo?: string;
}
