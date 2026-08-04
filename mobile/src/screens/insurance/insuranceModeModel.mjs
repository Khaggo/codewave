export const INSURANCE_MODE_TABS = Object.freeze([
  Object.freeze({ key: 'home', label: 'Home' }),
  Object.freeze({ key: 'request', label: 'Request' }),
  Object.freeze({ key: 'documents', label: 'Documents' }),
  Object.freeze({ key: 'status', label: 'Status' }),
])

const insuranceModeTabKeys = new Set(
  INSURANCE_MODE_TABS.map((tab) => tab.key),
)
const panelScrollTabKeys = new Set(['request', 'documents', 'status'])

export function resolveInsuranceModeTab(section) {
  return insuranceModeTabKeys.has(section) ? section : 'home'
}

export function insuranceModeUsesPanelScroll(section) {
  return panelScrollTabKeys.has(resolveInsuranceModeTab(section))
}

export function canOpenInsuranceVehiclePicker({
  hasSession = false,
  ownedVehicles = [],
} = {}) {
  return Boolean(hasSession && Array.isArray(ownedVehicles) && ownedVehicles.length)
}

export function buildInsuranceContentInsets(
  insets = {},
  { minimumTop = 18, minimumBottom = 24 } = {},
) {
  return {
    paddingTop: Math.max(Number(insets?.top) || 0, minimumTop),
    paddingBottom: Math.max(Number(insets?.bottom) || 0, minimumBottom),
  }
}
