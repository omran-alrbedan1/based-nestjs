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
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  customerId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  vehicleOwnershipId!: number;

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

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsInt({ each: true, message: i18nValidationMessage('validation.is_int') })
  @Min(1, { each: true, message: i18nValidationMessage('validation.min') })
  visitReasonIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsInt({ each: true, message: i18nValidationMessage('validation.is_int') })
  @Min(1, { each: true, message: i18nValidationMessage('validation.min') })
  vehicleConditionOptionIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.is_array') })
  @ArrayUnique({ message: i18nValidationMessage('validation.array_unique') })
  @IsInt({ each: true, message: i18nValidationMessage('validation.is_int') })
  @Min(1, { each: true, message: i18nValidationMessage('validation.min') })
  vehicleItemOptionIds?: number[];

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
