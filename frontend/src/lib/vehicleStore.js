/**
 * Module-level reactive store for legacy web-only vehicle entry.
 * It intentionally starts empty so demo pages never show fake customer records.
 */
let _vehicles = []
const _listeners = new Set()

export function getVehicles() { return _vehicles }

export function addVehicle(vehicle) {
  _vehicles = [..._vehicles, vehicle]
  _listeners.forEach(fn => fn(_vehicles))
}

export function subscribeVehicles(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
