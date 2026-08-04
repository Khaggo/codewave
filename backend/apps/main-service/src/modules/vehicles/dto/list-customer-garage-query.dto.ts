import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListCustomerGarageQueryDto {
  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 25,
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque versioned keyset cursor returned by the previous page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive plate, make, or model search.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
