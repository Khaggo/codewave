import {
  vehicleTimelineEventCategoryEnum,
  vehicleTimelineSourceTypeEnum,
} from '../schemas/vehicle-lifecycle.schema';

type VehicleTimelineEventCategory = (typeof vehicleTimelineEventCategoryEnum.enumValues)[number];
type VehicleTimelineSourceType = (typeof vehicleTimelineSourceTypeEnum.enumValues)[number];

export class AppendVehicleTimelineEventDto {
  vehicleId!: string;
  eventType!: string;
  eventCategory!: VehicleTimelineEventCategory;
  sourceType!: VehicleTimelineSourceType;
  sourceId!: string;
  occurredAt!: Date;
  verified!: boolean;
  inspectionId?: string | null;
  actorUserId?: string | null;
  notes?: string | null;
  dedupeKey!: string;
}
