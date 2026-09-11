import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';

export class TransferOwnershipDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.is_int') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  customerId!: number;
}
