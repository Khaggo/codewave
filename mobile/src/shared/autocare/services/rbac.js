export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SERVICE_ADVISER: 'SERVICE_ADVISER',
  TECHNICIAN: 'TECHNICIAN',
  CUSTOMER: 'CUSTOMER',
}

export const ACTION = {
  QA_AUDIT_APPROVE: 'qa.audit.approve',
  QA_AUDIT_REVIEW: 'qa.audit.review',
  QA_AUDIT_RESOLVE: 'qa.audit.resolve',
  USERS_MANAGE_ROLES: 'users.manage.roles',
  BOOKINGS_MANAGE: 'bookings.manage',
  INSURANCE_MANAGE: 'insurance.manage',
  INVENTORY_MANAGE: 'inventory.manage',
  LOYALTY_MANAGE: 'loyalty.manage',
  JOB_ORDER_UPDATE_OWN: 'job_order.update.own',
  JOB_ORDER_VIEW_ASSIGNED: 'job_order.view.assigned',
  TIMELINE_VIEW: 'timeline.view',
  BOOKING_CREATE: 'booking.create',
  SHOP_ORDER_CREATE: 'shop.order.create',
}

const PERMISSION_MATRIX = {
  [ROLE.SUPER_ADMIN]: [
    ACTION.QA_AUDIT_APPROVE,
    ACTION.QA_AUDIT_REVIEW,
    ACTION.QA_AUDIT_RESOLVE,
    ACTION.USERS_MANAGE_ROLES,
    ACTION.BOOKINGS_MANAGE,
    ACTION.INSURANCE_MANAGE,
    ACTION.INVENTORY_MANAGE,
    ACTION.LOYALTY_MANAGE,
  ],
  [ROLE.ADMIN]: [
    ACTION.QA_AUDIT_APPROVE,
    ACTION.QA_AUDIT_REVIEW,
    ACTION.BOOKINGS_MANAGE,
    ACTION.INSURANCE_MANAGE,
    ACTION.INVENTORY_MANAGE,
    ACTION.LOYALTY_MANAGE,
  ],
  [ROLE.SERVICE_ADVISER]: [
    ACTION.QA_AUDIT_REVIEW,
    ACTION.BOOKINGS_MANAGE,
    ACTION.INSURANCE_MANAGE,
    ACTION.TIMELINE_VIEW,
  ],
  [ROLE.TECHNICIAN]: [
    ACTION.QA_AUDIT_RESOLVE,
    ACTION.JOB_ORDER_UPDATE_OWN,
    ACTION.JOB_ORDER_VIEW_ASSIGNED,
    ACTION.TIMELINE_VIEW,
  ],
  [ROLE.CUSTOMER]: [
    ACTION.BOOKING_CREATE,
    ACTION.TIMELINE_VIEW,
    ACTION.SHOP_ORDER_CREATE,
  ],
}

/**
 * @param {string} role
 * @returns {string[]}
 */
export function getRolePermissions(role) {
  return [...(PERMISSION_MATRIX[role] || [])]
}

/**
 * @param {string} role
 * @param {string} action
 * @returns {boolean}
 */
export function hasPermission(role, action) {
  return getRolePermissions(role).includes(action)
}
