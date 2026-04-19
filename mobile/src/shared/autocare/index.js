// @autocare/shared — barrel export

// Validation
export {
  monthLabels,
  normalizeEmail,
  normalizePhoneNumber,
  buildUsername,
  formatDate,
  formatMonthYear,
  cloneDate,
  calculateAge,
  passwordRequirementItems,
  getPasswordChecks,
  getChangePasswordChecklistState,
  isPasswordValid,
  validateEmail,
  validatePhoneNumber,
  validateBirthday,
  validatePassword,
  validateLoginForm,
  validateChangePassword,
} from './utils/validation.js';

// Theme / Colors
export { brand, semantic, light, dark, radius } from './theme/colors.js';

// Decision Support
export {
  getMaintenanceAlerts,
  getRecommendation,
  getVehicleSummary,
} from './services/decisionSupport.js';

// QA Audit Domain
export {
  AUDIT_STATUS,
  SEMANTIC_PASS_THRESHOLD,
  MAX_INSPECTION_RISK_POINTS,
  isSemanticGatePassed,
  isRiskGatePassed,
  getSuggestedAuditStatus,
  isHighRiskAuditCase,
} from './services/qaAudit.js';

// Service Summary Domain
export {
  SERVICE_SUMMARY_STATUS,
  isServiceSummaryVerified,
  getServiceSummaryForJobOrder,
} from './services/serviceSummaries.js';

// Insurance Domain
export {
  INSURANCE_INQUIRY_TYPE,
  INSURANCE_INQUIRY_STATUS,
  canAttachProofOfPayment,
  isInsuranceQuoteReady,
  isInsuranceIssued,
} from './services/insurance.js';

// RBAC Domain
export {
  ROLE,
  ACTION,
  getRolePermissions,
  hasPermission,
} from './services/rbac.js';

// Operations Store
export {
  LOW_STOCK_THRESHOLD,
  subscribeOperations,
  getInventoryProductsSnapshot,
  getCatalogCategoriesSnapshot,
  getPublishedCatalogProductsSnapshot,
  getAppointmentsSnapshot,
  getOperationsActivitySnapshot,
  getLowStockProducts,
  sanitizeProductInput,
  addCatalogCategory,
  addInventoryProduct,
  archiveInventoryProduct,
  checkoutCart,
  createAppointment,
  convertAppointmentToJobOrder,
  updateAppointmentStage,
  resetOperationsState,
} from './services/operationsStore.js';

// API Client
export { auth, setBaseUrl } from './services/api.js';

// Mock Data
export {
  vehicles,
  appointments,
  timelineEvents,
  jobOrders,
  servicesCatalog,
  loyaltyAccounts,
  shopProducts,
  SHOPS,
  TECHNICIANS,
  rewardCatalog,
  loyaltyDeals,
  redemptionLog,
  qaAuditCases,
  serviceSummaries,
  insuranceInquiries,
  salesInvoices,
  monthlyRevenue,
  bookingVolume,
  peakHourData,
} from './services/mockData.js';
