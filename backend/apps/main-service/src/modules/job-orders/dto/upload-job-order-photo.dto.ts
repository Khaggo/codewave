import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UploadJobOrderPhotoDto {
  @ApiPropertyOptional({
    example: 'Front suspension before tightening.',
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
}
