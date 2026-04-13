/**
 * Module-level reactive store for appointments.
 * Any component that calls addAppointment() will trigger re-renders
 * in all components using useAppointments().
 */
import { appointments as initialAppointments } from './mockData'

let _appointments = [...initialAppointments]
const _listeners  = new Set()

export function getAppointments() { return _appointments }

export function addAppointment(appointment) {
  _appointments = [..._appointments, appointment]
  _listeners.forEach(fn => fn(_appointments))
}

export function subscribeAppointments(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
