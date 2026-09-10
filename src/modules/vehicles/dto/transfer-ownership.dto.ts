import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class TransferOwnershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: i18nValidationMessage('validation.is_uuid') })
  customerId!: string;
}
