import fs from 'node:fs';
import path from 'node:path';

import { requireConfiguredQaPassword } from './qaCredentialConfig.mjs';

const staticMobileExportPath = path.resolve('mobile/.runtime/qa-mobile-web-export/index.html');
const useStaticMobileExport =
  !process.env.QA_MOBILE_BASE_URL &&
  process.env.QA_USE_STATIC_MOBILE_EXPORT === 'true' &&
  fs.existsSync(staticMobileExportPath);
const sharedQaPassword = process.env.BOOKING_JOB_ORDER_QA_PASSWORD;

export const runtimeConfig = {
  staffBaseUrl: process.env.QA_STAFF_BASE_URL ?? 'http://127.0.0.1:3002',
  mobileBaseUrl: process.env.QA_MOBILE_BASE_URL ?? (useStaticMobileExport ? 'http://127.0.0.1:8095' : 'http://127.0.0.1:8090'),
  apiBaseUrl: process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000',
};

export const qaAccounts = {
  customer: {
    email: process.env.QA_CUSTOMER_EMAIL ?? 'qa.booking.customer@example.com',
    password: requireConfiguredQaPassword('customer', [
      process.env.QA_CUSTOMER_PASSWORD,
      sharedQaPassword,
    ]),
  },
  adviser: {
    email: process.env.QA_ADVISER_EMAIL ?? 'qa.booking.adviser@autocare.com',
    password: requireConfiguredQaPassword('staff', [
      process.env.QA_ADVISER_PASSWORD,
      process.env.QA_STAFF_PASSWORD,
      sharedQaPassword,
    ]),
  },
  technician: {
    email: process.env.QA_TECHNICIAN_EMAIL ?? 'qa.booking.tech@autocare.com',
    password: requireConfiguredQaPassword('staff', [
      process.env.QA_TECHNICIAN_PASSWORD,
      process.env.QA_STAFF_PASSWORD,
      sharedQaPassword,
    ]),
    staffCode: process.env.QA_TECHNICIAN_CODE ?? 'QA-JO-TEC',
  },
  headTechnician: {
    email: process.env.QA_HEAD_TECHNICIAN_EMAIL ?? 'qa.booking.headtech@autocare.com',
    password: requireConfiguredQaPassword('staff', [
      process.env.QA_HEAD_TECHNICIAN_PASSWORD,
      process.env.QA_STAFF_PASSWORD,
      sharedQaPassword,
    ]),
  },
};

export const seededVehicle = {
  plateNumber: process.env.QA_SEEDED_PLATE ?? 'QAJO1001',
  label: process.env.QA_SEEDED_VEHICLE_LABEL ?? 'Toyota Vios',
};

export function createRunMarker(prefix = 'PW-QA') {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}-${stamp}`;
}

export function formatUiDateLabel(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatLongUiDateLabel(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
