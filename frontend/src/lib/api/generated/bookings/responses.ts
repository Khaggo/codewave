import type { BookingStatus } from './requests';

export interface ServiceResponse {
  id: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlotResponse {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingAvailabilityDayStatus =
  | 'bookable'
  | 'limited'
  | 'full'
  | 'outside_window'
  | 'no_active_slots';

export type BookingAvailabilitySlotStatus = 'available' | 'full';

export interface BookingAvailabilitySlotResponse {
  timeSlotId: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookingCount: number;
  remainingCapacity: number;
  status: BookingAvailabilitySlotStatus;
  isAvailable: boolean;
}

export interface BookingAvailabilityDayResponse {
  scheduledDate: string;
  status: BookingAvailabilityDayStatus;
  isBookable: boolean;
  activeSlotCount: number;
  availableSlotCount: number;
  totalCapacity: number;
  remainingCapacity: number;
  slots: BookingAvailabilitySlotResponse[];
}

export interface BookingAvailabilityResponse {
  generatedAt: string;
  startDate: string;
  endDate: string;
  minBookableDate: string;
  maxBookableDate: string;
  days: BookingAvailabilityDayResponse[];
}

export interface BookingDiscoverySnapshotResponse {
  services: ServiceResponse[];
  timeSlots: TimeSlotResponse[];
}

export interface BookingServiceResponse {
  id: string;
  bookingId: string;
  serviceId: string;
  service: ServiceResponse;
  createdAt: string;
}

export interface BookingStatusHistoryResponse {
  id: string;
  bookingId: string;
  previousStatus?: BookingStatus | null;
  nextStatus: BookingStatus;
  reason?: string | null;
  changedByUserId?: string | null;
  changedAt: string;
}

export interface BookingResponse {
  id: string;
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  scheduledDate: string;
  status: BookingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  timeSlot?: TimeSlotResponse;
  requestedServices?: BookingServiceResponse[];
  statusHistory?: BookingStatusHistoryResponse[];
}

export interface DailyScheduleSlotView {
  timeSlotId: string;
  label: string;
  totalCapacity: number;
  confirmedCount: number;
  pendingCount: number;
  rescheduledCount: number;
  bookings: BookingResponse[];
}

export interface DailyScheduleResponse {
  scheduledDate: string;
  slots: DailyScheduleSlotView[];
}

export interface QueueCurrentItem {
  queuePosition: number;
  bookingId: string;
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  timeSlotLabel: string;
  scheduledDate: string;
  status: BookingStatus;
}

export interface QueueCurrentResponse {
  generatedAt: string;
  scheduledDate: string;
  currentCount: number;
  items: QueueCurrentItem[];
}
