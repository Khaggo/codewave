import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class AddJobOrderPhotoDto {
  @ApiProperty({
    example: 'front-brake-before.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    example: 'https://files.example.com/job-orders/front-brake-before.jpg',
  })
  @IsString()
  @IsUrl({
    require_protocol: true,
  })
  fileUrl!: string;

  @ApiPropertyOptional({
    example: 'Visible brake-pad wear before replacement.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({
    enum: ['job_order', 'progress_entry', 'work_item', 'qa_review'],
    example: 'work_item',
  })
  @IsOptional()
  @IsIn(['job_order', 'progress_entry', 'work_item', 'qa_review'])
  linkedEntityType?: 'job_order' | 'progress_entry' | 'work_item' | 'qa_review';

  @ApiPropertyOptional({
    example: '8bcb97fe-0aa4-4c68-ae49-2f58c4526529',
  })
  @IsOptional()
  @IsUUID()
  linkedEntityId?: string;

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
