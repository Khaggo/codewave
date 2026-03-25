import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vin?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
