import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListAdminCustomersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => String(value ?? '').trim() || undefined)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit: number = 25;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  paged: boolean = false;
}
