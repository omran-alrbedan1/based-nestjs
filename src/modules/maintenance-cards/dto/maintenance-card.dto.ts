import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FuelLevel, MaintenanceWorkStatus } from 'generated/prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);
export class RequiredWorkInputDto {
  @ApiProperty()
  @Transform(trim)
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.max_length') })
  description!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  displayOrder!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  isRequired?: boolean;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: i18nValidationMessage('validation.is_number') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  estimatedCost?: number | null;
}

export class CreateMaintenanceCardDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: i18nValidationMessage('validation.is_uuid') })
  customerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: i18nValidationMessage('validation.is_uuid') })
  vehicleOwnershipId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  receivedAt!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  expectedDeliveryAt?: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  mileage!: number;

  @ApiProperty({ enum: FuelLevel })
  @IsEnum(FuelLevel, { message: i18nValidationMessage('validation.is_enum') })
  fuelLevel!: FuelLevel;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  customerComplaint?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  inspectionNotes?: string;

  @ApiProperty()
  @IsBoolean({ message: i18nValidationMessage('validation.is_boolean') })
  customerApproved!: boolean;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.is_string') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.not_empty') })
  customerApprovalName?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: i18nValidationMessage('validation.is_date_string') })
  customerApprovedAt?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsUUID('4', { each: true, message: i18nValidationMessage('validation.is_uuid') })
  visitReasonIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsUUID('4', { each: true, message: i18nValidationMessage('validation.is_uuid') })
  vehicleConditionOptionIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsUUID('4', { each: true, message: i18nValidationMessage('validation.is_uuid') })
  vehicleItemOptionIds?: string[];

  @ApiPropertyOptional({ type: [RequiredWorkInputDto] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ValidateNested({ each: true })
  @Type(() => RequiredWorkInputDto)
  requiredWorks?: RequiredWorkInputDto[];
}

export class UpdateMaintenanceCardDto extends PartialType(
  OmitType(CreateMaintenanceCardDto, [
    'customerId',
    'vehicleOwnershipId',
    'receivedAt',
    'requiredWorks',
  ]),
) {}

export class UpdateRequiredWorkDto extends PartialType(RequiredWorkInputDto) {
  @ApiPropertyOptional({ enum: MaintenanceWorkStatus })
  @IsOptional()
  @IsEnum(MaintenanceWorkStatus, { message: i18nValidationMessage('validation.is_enum') })
  status?: MaintenanceWorkStatus;
}
