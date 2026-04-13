/**
 * Module-level reactive store for vehicles.
 * Any component that calls addVehicle() will trigger re-renders
 * in all components using useVehicles().
 */
import { vehicles as initialVehicles } from './mockData'

let _vehicles   = [...initialVehicles]
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
