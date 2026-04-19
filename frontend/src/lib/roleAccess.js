'use client'

import { ACTION, ROLE, hasPermission } from '@autocare/shared'

const LEGACY_ROLE_MAP = {
  'Super Admin': ROLE.SUPER_ADMIN,
  'Branch Manager': ROLE.SUPER_ADMIN,
  'Admin': ROLE.ADMIN,
  'Administrator': ROLE.ADMIN,
  'Service Manager': ROLE.ADMIN,
  'Service Adviser': ROLE.SERVICE_ADVISER,
  'Service Advisor': ROLE.SERVICE_ADVISER,
  'Service Staff': ROLE.SERVICE_ADVISER,
  'Technician': ROLE.TECHNICIAN,
  'Customer': ROLE.CUSTOMER,
}

export function resolveSharedRole(role) {
  if (!role) return ROLE.CUSTOMER
  if (Object.values(ROLE).includes(role)) return role
  return LEGACY_ROLE_MAP[role] ?? ROLE.CUSTOMER
}

export function canApproveAudit(role) {
  return hasPermission(resolveSharedRole(role), ACTION.QA_AUDIT_APPROVE)
}
