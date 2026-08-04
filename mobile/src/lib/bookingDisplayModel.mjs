const formatClockLabel = (value) => {
  const normalizedValue = String(value ?? '').trim()
  const match = /^(\d{2}):(\d{2})$/.exec(normalizedValue)

  if (!match) {
    return normalizedValue || '--'
  }

  const hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${minutes} ${meridiem}`
}

export const formatBookingTimeSlotWindow = (timeSlot) => {
  if (!timeSlot) {
    return 'Time unavailable'
  }

  return `${formatClockLabel(timeSlot.startTime)} - ${formatClockLabel(timeSlot.endTime)}`
}

export const buildOwnedVehicleLabel = (vehicle) => {
  const vehicleLabel = [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return (
    vehicleLabel ||
    String(vehicle?.plateNumber ?? '').trim() ||
    'Owned vehicle'
  )
}
