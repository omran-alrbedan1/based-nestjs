import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MaintenanceWorkStatus } from 'generated/prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

export class WorkActionReasonDto {
  @ApiProperty({ description: 'Required reason for the action.' })
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.max_length') })
  reason!: string;
}

export class ReopenWorkDto extends WorkActionReasonDto {
  @ApiPropertyOptional({
    enum: [MaintenanceWorkStatus.PENDING, MaintenanceWorkStatus.IN_PROGRESS],
    description:
      'Target status after reopening. Only completed work may reopen to IN_PROGRESS; ' +
      'cancelled work always returns to PENDING.',
  })
  @IsOptional()
  @IsEnum(MaintenanceWorkStatus, { message: i18nValidationMessage('validation.is_enum') })
  targetStatus?: MaintenanceWorkStatus;
}
