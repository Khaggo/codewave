export const REFERENCE_UNAVAILABLE = 'Reference unavailable'

export const getCustomerVehicleReference = (vehicle) => {
  const reference = String(vehicle?.publicReference ?? '').trim()
  return reference || REFERENCE_UNAVAILABLE
}
