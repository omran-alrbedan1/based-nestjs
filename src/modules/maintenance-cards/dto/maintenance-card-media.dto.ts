import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UploadMaintenanceCardPhotosDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
