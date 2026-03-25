import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  userId!: string;

  @IsString()
  @MaxLength(20)
  plateNumber!: string;

  @IsString()
  @MaxLength(100)
  make!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsInt()
  @Min(1900)
  year!: number;

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
