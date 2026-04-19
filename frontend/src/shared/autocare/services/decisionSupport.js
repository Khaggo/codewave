// ─────────────────────────────────────────────────────────────────────────────
//  @autocare/shared — Decision Support / Expert System
//  Rule-based maintenance advisory engine used by both Web and Mobile.
// ─────────────────────────────────────────────────────────────────────────────

import { servicesCatalog } from './mockData';

// ── Maintenance interval rules (km) ─────────────────────────────────────────

const INTERVAL_RULES = [
  { service: 'Oil Change',              intervalKm: 5000,  priority: 'high',     leadKm: 500  },
  { service: 'PMS 10,000 km Package',   intervalKm: 10000, priority: 'high',     leadKm: 1000 },
  { service: 'PMS 20,000 km Package',   intervalKm: 20000, priority: 'high',     leadKm: 2000 },
  { service: 'Air Filter Replacement',  intervalKm: 15000, priority: 'medium',   leadKm: 1500 },
  { service: 'Fuel Filter Replacement', intervalKm: 30000, priority: 'medium',   leadKm: 3000 },
  { service: 'Brake Inspection',        intervalKm: 20000, priority: 'high',     leadKm: 2000 },
  { service: 'Brake Fluid Flush',       intervalKm: 40000, priority: 'medium',   leadKm: 5000 },
  { service: 'Coolant Flush',           intervalKm: 40000, priority: 'medium',   leadKm: 5000 },
  { service: 'Tire Rotation',           intervalKm: 10000, priority: 'low',      leadKm: 1000 },
  { service: 'Suspension Check',        intervalKm: 50000, priority: 'medium',   leadKm: 5000 },
  { service: 'Battery Health Review',   intervalKm: 30000, priority: 'medium',   leadKm: 3000 },
  { service: 'Comprehensive Inspection',intervalKm: 80000, priority: 'high',     leadKm: 5000 },
];

// ── Time-based rules (days since last service) ─────────────────────────────

const TIME_RULES = [
  { condition: 'no_service_90_days',  days: 90,  message: 'No service records in over 90 days. Schedule a check-up.', severity: 'Advisory'      },
  { condition: 'no_service_180_days', days: 180, message: 'No service records in over 6 months. Overdue for maintenance.', severity: 'High Priority' },
];

// ── Severity mapping ────────────────────────────────────────────────────────

const SEVERITY_MAP = {
  high:   'High Priority',
  medium: 'Advisory',
  low:    'Routine',
};

// ── Helper: days between two dates ──────────────────────────────────────────

function daysBetween(dateA, dateB) {
  const msPerDay = 86400000;
  return Math.floor(Math.abs(new Date(dateA) - new Date(dateB)) / msPerDay);
}

// ── Core: generate maintenance alerts for a vehicle ────────────────────────

/**
 * Generates maintenance alerts for a single vehicle.
 *
 * @param {object}   vehicle        – { id, plate, model, mileage, status }
 * @param {object[]} serviceHistory – array of timeline events / job orders
 *                                    with { services[], date, description }
 * @returns {object[]} alerts – [{ id, title, severity, detail, service, kmRemaining? }]
 */
export function getMaintenanceAlerts(vehicle, serviceHistory = []) {
  const alerts = [];
  const now = new Date();

  // ── Mileage-based alerts ──────────────────────────────────────────────
  for (const rule of INTERVAL_RULES) {
    const lastService = serviceHistory
      .filter((e) => e.services?.some((s) => s.toLowerCase().includes(rule.service.toLowerCase()))
                  || e.description?.toLowerCase().includes(rule.service.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const lastServiceKm = lastService ? estimateKmAtService(vehicle, lastService) : 0;
    const kmSinceLast = vehicle.mileage - lastServiceKm;
    const kmRemaining = rule.intervalKm - kmSinceLast;

    if (kmRemaining <= rule.leadKm) {
      const overdue = kmRemaining <= 0;
      alerts.push({
        id: `mileage-${vehicle.id}-${rule.service}`,
        title: overdue
          ? `Plate ${vehicle.plate}: ${rule.service} overdue by ${Math.abs(kmRemaining).toLocaleString()} km.`
          : `Plate ${vehicle.plate}: ${rule.service} predicted in ${kmRemaining.toLocaleString()} km.`,
        severity: SEVERITY_MAP[rule.priority],
        detail: overdue
          ? `Current mileage (${vehicle.mileage.toLocaleString()} km) exceeds the ${rule.intervalKm.toLocaleString()} km interval for ${rule.service}.`
          : `Based on a ${rule.intervalKm.toLocaleString()} km service interval, this vehicle is approaching the ${rule.service} threshold.`,
        service: rule.service,
        kmRemaining,
      });
    }
  }

  // ── Time-based alerts ─────────────────────────────────────────────────
  const mostRecent = serviceHistory
    .filter((e) => e.type === 'service' || e.type === 'repair')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (mostRecent) {
    const daysSince = daysBetween(now, mostRecent.date);
    for (const rule of TIME_RULES) {
      if (daysSince >= rule.days) {
        alerts.push({
          id: `time-${vehicle.id}-${rule.condition}`,
          title: `Plate ${vehicle.plate}: ${rule.message}`,
          severity: rule.severity,
          detail: `Last recorded service was ${daysSince} days ago on ${mostRecent.date}.`,
        });
        break; // Only show the most severe time-based alert
      }
    }
  } else if (vehicle.status !== 'inactive') {
    alerts.push({
      id: `time-${vehicle.id}-no_history`,
      title: `Plate ${vehicle.plate}: No service history found.`,
      severity: 'Advisory',
      detail: 'This vehicle has no recorded services. Consider scheduling an initial inspection.',
    });
  }

  // ── High-mileage flag ─────────────────────────────────────────────────
  if (vehicle.mileage >= 80000 && vehicle.status !== 'inactive') {
    const hasRecentInspection = serviceHistory.some(
      (e) => e.description?.toLowerCase().includes('inspection') && daysBetween(now, e.date) < 180
    );
    if (!hasRecentInspection) {
      alerts.push({
        id: `highmileage-${vehicle.id}`,
        title: `Plate ${vehicle.plate}: High mileage (${vehicle.mileage.toLocaleString()} km) — comprehensive inspection recommended.`,
        severity: 'High Priority',
        detail: `Vehicles above 80,000 km benefit from a comprehensive inspection every 6 months.`,
      });
    }
  }

  return alerts;
}

// ── Core: generate customer-facing recommendations for a booking ───────────

/**
 * Generates service recommendations shown to the customer (mobile app).
 *
 * @param {object}   booking  – { id, vehicleId, chosenServices[], status }
 * @param {object}   vehicle  – { id, plate, model, mileage }
 * @param {object[]} history  – past service events for this vehicle
 * @returns {object|null} recommendation – { message, suggestedService, priceLabel } or null
 */
export function getRecommendation(booking, vehicle, history = []) {
  if (!vehicle || !booking) return null;

  const chosenLower = (booking.chosenServices || []).map((s) => s.toLowerCase());

  // If getting an oil change, suggest air filter if overdue
  if (chosenLower.some((s) => s.includes('oil change'))) {
    const lastAirFilter = history.find(
      (e) => e.description?.toLowerCase().includes('air filter')
    );
    const kmSinceAirFilter = lastAirFilter
      ? vehicle.mileage - estimateKmAtService(vehicle, lastAirFilter)
      : vehicle.mileage;

    if (kmSinceAirFilter >= 15000 && !chosenLower.some((s) => s.includes('air filter'))) {
      const price = servicesCatalog.find((s) => s.id === 's4')?.price || 450;
      return {
        message: `Your air filter hasn't been replaced in over ${kmSinceAirFilter.toLocaleString()} km. We recommend adding an Air Filter Replacement to this visit.`,
        suggestedService: 'Air Filter Replacement',
        priceLabel: `₱${price.toLocaleString()}`,
      };
    }
  }

  // If getting PMS, suggest brake inspection if mileage is high
  if (chosenLower.some((s) => s.includes('pms'))) {
    if (vehicle.mileage >= 40000 && !chosenLower.some((s) => s.includes('brake'))) {
      return {
        message: `At ${vehicle.mileage.toLocaleString()} km, a brake inspection is recommended alongside your PMS.`,
        suggestedService: 'Brake Inspection',
        priceLabel: '₱700',
      };
    }
  }

  return null;
}

// ── Core: generate AI summary for a vehicle timeline ───────────────────────

/**
 * Generates a natural-language AI summary for a vehicle's service history.
 *
 * @param {object}   vehicle – { id, plate, model, mileage, status }
 * @param {object[]} history – timeline events for this vehicle
 * @returns {string} summary text
 */
export function getVehicleSummary(vehicle, history = []) {
  if (!vehicle) return 'No vehicle data available.';

  const services = history.filter((e) => e.type === 'service' || e.type === 'repair');
  const alerts = history.filter((e) => e.type === 'alert');
  const recentService = services.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const activeAlerts = alerts.filter((e) => !e.isVerified);

  const parts = [];

  // Vehicle identification
  parts.push(`${vehicle.plate} (${vehicle.model})`);

  // Service consistency
  if (services.length >= 3) {
    parts.push('has received consistent preventive maintenance.');
  } else if (services.length > 0) {
    parts.push('has limited service records on file.');
  } else {
    parts.push('has no recorded service history.');
  }

  // Recent service mention
  if (recentService) {
    parts.push(`The most recent service: ${recentService.description}`);
  }

  // Active alerts
  if (activeAlerts.length > 0) {
    parts.push(`Active alert: ${activeAlerts[0].description}`);
  }

  // Mileage-based advice
  const maintenanceAlerts = getMaintenanceAlerts(vehicle, history);
  const topAlert = maintenanceAlerts[0];
  if (topAlert) {
    parts.push(topAlert.title.replace(`Plate ${vehicle.plate}: `, ''));
  }

  // Status note
  if (vehicle.status === 'maintenance') {
    parts.push('This vehicle is currently under repair.');
  } else if (vehicle.status === 'inactive') {
    parts.push('This vehicle record is currently inactive.');
  }

  return parts.join(' ');
}

// ── Helper: estimate km at time of past service ────────────────────────────
// Without odometer snapshots, we approximate based on current mileage and
// age of the service record.

function estimateKmAtService(vehicle, serviceEvent) {
  const now = new Date();
  const serviceDate = new Date(serviceEvent.date);
  const daysSince = daysBetween(now, serviceDate);

  // Assume ~40 km/day average driving (Philippine urban/suburban mix)
  const estimatedKmDriven = daysSince * 40;
  return Math.max(0, vehicle.mileage - estimatedKmDriven);
}
