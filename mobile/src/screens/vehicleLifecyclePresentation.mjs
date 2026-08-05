import { getCustomerVehicleReference } from '../lib/vehicleReference.mjs';
import { formatVehicleDisplayName } from '../utils/validation';

export const createEmptyVehicleDraft = () => ({
  licensePlate: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  color: '',
});

export const getVehicleLabel = (vehicle) =>
  formatVehicleDisplayName({
    vehicleMake: vehicle?.make ?? vehicle?.vehicleMake,
    vehicleModel: vehicle?.model ?? vehicle?.vehicleModel,
    vehicleYear: vehicle?.year ?? vehicle?.vehicleYear,
  }) || vehicle?.plateNumber || vehicle?.licensePlate || 'Vehicle';

export const getVehiclePlate = (vehicle) =>
  vehicle?.plateNumber ?? vehicle?.licensePlate ?? 'No plate recorded';

export const getVehicleReference = (vehicle) => getCustomerVehicleReference(vehicle);
