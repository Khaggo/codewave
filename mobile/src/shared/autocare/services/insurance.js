export const INSURANCE_INQUIRY_TYPE = {
  CTPL: 'CTPL',
  COMPREHENSIVE: 'Comprehensive',
}

export const INSURANCE_INQUIRY_STATUS = {
  SUBMITTED: 'Submitted',
  RFQ_PENDING: 'RFQ_Pending',
  QUOTED: 'Quoted',
  APPROVED: 'Approved',
  ISSUED: 'Issued',
}

/**
 * @typedef {Object} InsuranceInquiry
 * @property {string} id
 * @property {string} vehicleId
 * @property {string} customerId
 * @property {'CTPL' | 'Comprehensive'} inquiryType
 * @property {'Submitted' | 'RFQ_Pending' | 'Quoted' | 'Approved' | 'Issued'} status
 * @property {string | null} quotePdfUrl
 * @property {string | null} proofOfPaymentUrl
 */

/**
 * @param {string} status
 * @returns {boolean}
 */
export function canAttachProofOfPayment(status) {
  return [
    INSURANCE_INQUIRY_STATUS.QUOTED,
    INSURANCE_INQUIRY_STATUS.APPROVED,
    INSURANCE_INQUIRY_STATUS.ISSUED,
  ].includes(status)
}

/**
 * @param {Partial<InsuranceInquiry>} inquiry
 * @returns {boolean}
 */
export function isInsuranceQuoteReady(inquiry = {}) {
  return Boolean(inquiry.quotePdfUrl) && [
    INSURANCE_INQUIRY_STATUS.QUOTED,
    INSURANCE_INQUIRY_STATUS.APPROVED,
    INSURANCE_INQUIRY_STATUS.ISSUED,
  ].includes(inquiry.status)
}

/**
 * @param {Partial<InsuranceInquiry>} inquiry
 * @returns {boolean}
 */
export function isInsuranceIssued(inquiry = {}) {
  return inquiry.status === INSURANCE_INQUIRY_STATUS.ISSUED
}
