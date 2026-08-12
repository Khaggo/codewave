import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export enum ServiceManagementStatus {
  All = 'all',
  Active = 'active',
  Inactive = 'inactive',
}

export class ListServiceManagementQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive service name or description search.', example: 'oil' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by service category identifier.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ServiceManagementStatus, default: ServiceManagementStatus.All })
  @IsOptional()
  @IsEnum(ServiceManagementStatus)
  status: ServiceManagementStatus = ServiceManagementStatus.All;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 25;
}
