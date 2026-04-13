import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { jobOrderSourceTypeEnum } from '../schemas/job-orders.schema';

import { CreateJobOrderItemDto } from './create-job-order-item.dto';

export class CreateJobOrderDto {
  @ApiProperty({
    enum: jobOrderSourceTypeEnum.enumValues,
    example: 'booking',
  })
  @IsEnum(jobOrderSourceTypeEnum.enumValues)
  sourceType!: (typeof jobOrderSourceTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  @IsUUID()
  sourceId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @IsUUID()
  customerUserId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({
    example: '5d9be480-c0be-4cc2-b89d-5c2ad7fc1c4d',
  })
  @IsUUID()
  serviceAdviserUserId!: string;

  @ApiProperty({
    example: 'SA-1001',
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40)
  serviceAdviserCode!: string;

  @ApiPropertyOptional({
    example: 'Customer reported engine noise after cold start.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    type: () => CreateJobOrderItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateJobOrderItemDto)
  items!: CreateJobOrderItemDto[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['61539ebf-e98a-45da-aa0d-a19acded1d7f'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  assignedTechnicianIds?: string[];
}
