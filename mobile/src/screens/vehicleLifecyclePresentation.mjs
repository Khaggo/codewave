import { getCustomerVehicleReference } from '../lib/vehicleReference.mjs';
import {
  getVehicleDisplayLabel,
  getVehicleFullLabel as buildVehicleFullLabel,
  getVehiclePlateLabel,
} from '../lib/vehicleDisplay.mjs';

export const createEmptyVehicleDraft = () => ({
  licensePlate: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  color: '',
});

export const getVehicleLabel = (vehicle) => getVehicleDisplayLabel(vehicle);

export const getVehicleFullLabel = (vehicle) => buildVehicleFullLabel(vehicle);

export const getVehiclePlate = (vehicle) => getVehiclePlateLabel(vehicle);

export const getVehicleReference = (vehicle) => getCustomerVehicleReference(vehicle);
