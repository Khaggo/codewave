export const SERVICE_SUMMARY_STATUS = {
  DRAFT: 'Draft',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  REVISED: 'Revised',
}

/**
 * @typedef {Object} ServiceSummary
 * @property {string} id
 * @property {string} jobOrderId
 * @property {string} timelineEventId
 * @property {string} vehicleId
 * @property {string} customerId
 * @property {string} originalTechnicalNote
 * @property {string} generatedLaymanSummary
 * @property {'Draft' | 'Verified' | 'Rejected' | 'Revised'} verificationStatus
 * @property {string | null} reviewerId
 */

/**
 * @param {Partial<ServiceSummary>} summary
 * @returns {boolean}
 */
export function isServiceSummaryVerified(summary = {}) {
  return summary.verificationStatus === SERVICE_SUMMARY_STATUS.VERIFIED
}

/**
 * @param {string} jobOrderId
 * @param {ServiceSummary[]} summaries
 * @returns {ServiceSummary | undefined}
 */
export function getServiceSummaryForJobOrder(jobOrderId, summaries = []) {
  return summaries.find((summary) => summary.jobOrderId === jobOrderId)
}
