export const AUDIT_STATUS = {
  PENDING: 'Pending',
  FLAGGED: 'Flagged',
  RESOLVED: 'Resolved',
  APPROVED: 'Approved',
}

export const SEMANTIC_PASS_THRESHOLD = 0.7
export const MAX_INSPECTION_RISK_POINTS = 3

/**
 * @typedef {Object} QAAuditCase
 * @property {string} id
 * @property {string} jobOrderId
 * @property {string} vehicleId
 * @property {string} customerId
 * @property {string} technicianNotes
 * @property {string[]} uploadedEvidence
 * @property {number} semanticResolutionScore
 * @property {number} inspectionRiskPoints
 * @property {'Pending' | 'Flagged' | 'Resolved' | 'Approved'} auditStatus
 */

/**
 * @param {number} score
 * @returns {boolean}
 */
export function isSemanticGatePassed(score) {
  return Number.isFinite(score) && score >= SEMANTIC_PASS_THRESHOLD
}

/**
 * @param {number} points
 * @returns {boolean}
 */
export function isRiskGatePassed(points) {
  return Number.isInteger(points) && points <= MAX_INSPECTION_RISK_POINTS
}

/**
 * @param {Partial<QAAuditCase>} auditCase
 * @returns {'Approved' | 'Flagged'}
 */
export function getSuggestedAuditStatus(auditCase = {}) {
  return isSemanticGatePassed(auditCase.semanticResolutionScore)
    && isRiskGatePassed(auditCase.inspectionRiskPoints)
    ? AUDIT_STATUS.APPROVED
    : AUDIT_STATUS.FLAGGED
}

/**
 * @param {Partial<QAAuditCase>} auditCase
 * @returns {boolean}
 */
export function isHighRiskAuditCase(auditCase = {}) {
  return !isSemanticGatePassed(auditCase.semanticResolutionScore)
    || !isRiskGatePassed(auditCase.inspectionRiskPoints)
}
