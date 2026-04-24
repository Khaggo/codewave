export interface VehicleResponse {
  id: string;
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  vin?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
