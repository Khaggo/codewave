import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimStringValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimAndDeduplicateStringArray = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) return value;

  return [...new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== ''),
  )];
};

export const intakeArrivalTypes = ['with_booking', 'walk_in'] as const;
export const intakeVisitTypes = [
  'regular_service',
  'insurance_related',
  'back_job_complaint',
  'inspection_only',
] as const;
export const paperChecklistStatuses = [
  'not_started',
  'in_progress',
  'transcribed',
  'reviewed',
] as const;
export const arrivalInspectionStatuses = ['unchecked', 'ok', 'issue'] as const;
export const vehicleStickerObservations = ['verified_present', 'not_present'] as const;

export class IntakeCustomerConcernDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @Transform(trimStringValue)
  id!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @Transform(trimStringValue)
  text!: string;
}
export const arrivalIssueSeverities = ['low', 'medium', 'high'] as const;

export type IntakeArrivalType = (typeof intakeArrivalTypes)[number];
export type IntakeVisitType = (typeof intakeVisitTypes)[number];
export type PaperChecklistStatus = (typeof paperChecklistStatuses)[number];
export type ArrivalInspectionStatus = (typeof arrivalInspectionStatuses)[number];
export type ArrivalIssueSeverity = (typeof arrivalIssueSeverities)[number];

export class IntakeInspectionIssueDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trimStringValue)
  location?: string;

  @ApiPropertyOptional({ enum: arrivalIssueSeverities })
  @IsOptional()
  @IsIn(arrivalIssueSeverities)
  severity?: ArrivalIssueSeverity;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimStringValue)
  notes?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trimStringValue)
  evidenceSlot?: string;
}

export class IntakeInspectionItemDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @Transform(trimStringValue)
  key!: string;

  @ApiProperty({ enum: arrivalInspectionStatuses })
  @IsIn(arrivalInspectionStatuses)
  @Transform(trimStringValue)
  status!: ArrivalInspectionStatus;

  @ApiPropertyOptional({ type: () => IntakeInspectionIssueDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IntakeInspectionIssueDto)
  issue?: IntakeInspectionIssueDto;
}

export class IntakeInspectionDataDto {
  @ApiProperty({ enum: intakeArrivalTypes, example: 'walk_in' })
  @IsIn(intakeArrivalTypes)
  arrivalType!: IntakeArrivalType;

  @ApiProperty({ enum: intakeVisitTypes, example: 'regular_service' })
  @IsIn(intakeVisitTypes)
  visitType!: IntakeVisitType;

  @ApiPropertyOptional({
    enum: vehicleStickerObservations,
    description: 'Staff observation captured at completed intake; drafts may leave this blank.',
  })
  @IsOptional()
  @IsIn(vehicleStickerObservations)
  stickerObservation?: (typeof vehicleStickerObservations)[number];

  @ApiPropertyOptional({
    maxLength: 240,
    description: 'Optional concise reason when the official sticker is not present.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(trimStringValue)
  stickerObservationReason?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(trimStringValue)
  reasonForVisit?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    maxItems: 8,
    description: 'Walk-in reasons, trimmed and deduplicated in first-seen order.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  @Transform(trimAndDeduplicateStringArray)
  reasonForVisits?: string[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimStringValue)
  requestedServiceSummary?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    maxItems: 25,
    description: 'Service identifiers. IDs are trimmed, deduplicated, and preserved verbatim.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Transform(trimAndDeduplicateStringArray)
  requestedServiceIds?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    maxItems: 25,
    description: 'Display names aligned to selected service IDs when supplied.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  @Transform(trimAndDeduplicateStringArray)
  requestedServiceNames?: string[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimStringValue)
  serviceConcern?: string;

  @ApiPropertyOptional({ type: () => IntakeCustomerConcernDto, isArray: true, maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => IntakeCustomerConcernDto)
  customerConcerns?: IntakeCustomerConcernDto[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentOdometerKm?: number;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(trimStringValue)
  fuelLevel?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  requirementsChecklist?: Record<string, boolean>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  preServiceChecklist?: Record<string, string>;

  @ApiPropertyOptional({
    type: () => IntakeInspectionItemDto,
    isArray: true,
    maxItems: 6,
    description: 'Structured reception checks; completion requires every item to be OK or Issue.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => IntakeInspectionItemDto)
  arrivalInspectionItems?: IntakeInspectionItemDto[];

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Transform(trimAndDeduplicateStringArray)
  damageAreas?: string[];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimStringValue)
  damageNotes?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimStringValue)
  customerItems?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerAcknowledged?: boolean;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trimStringValue)
  customerSignatureName?: string;

  @ApiPropertyOptional({ enum: paperChecklistStatuses })
  @IsOptional()
  @IsIn(paperChecklistStatuses)
  paperChecklistStatus?: PaperChecklistStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRepeatVisit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  urgencyFlag?: boolean;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimStringValue)
  missingRequirementsNote?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimStringValue)
  safetyAccessNotes?: string;
}

export class SaveIntakeInspectionDraftDto {
  @ApiPropertyOptional({ description: 'Required only for a booked arrival.' })
  @IsOptional()
  @IsString()
  @Transform(trimStringValue)
  bookingId?: string;

  @ApiProperty({ type: () => IntakeInspectionDataDto })
  @ValidateNested()
  @Type(() => IntakeInspectionDataDto)
  intakeData!: IntakeInspectionDataDto;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimStringValue)
  notes?: string;
}

export class InspectionHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'needs_followup', 'void'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'needs_followup', 'void'])
  status?: string;
}
