import {
  normalizeEmail,
  normalizePhoneNumber,
  validateEmail,
  validatePhoneNumber,
} from '@codewave/domain-utils'

export const buildInvoiceCheckoutName = (account) =>
  `${account?.firstName || ''} ${account?.lastName || ''}`.trim() ||
  account?.username ||
  ''

export const createInitialInvoiceCheckoutForm = (account) => ({
  recipientName: buildInvoiceCheckoutName(account),
  email: account?.email || '',
  contactPhone: account?.phoneNumber || '',
  addressLine1: account?.defaultAddress?.addressLine1 || '',
  addressLine2: account?.defaultAddress?.addressLine2 || '',
  city: account?.defaultAddress?.city || account?.city || '',
  province: account?.defaultAddress?.province || '',
  postalCode: account?.defaultAddress?.postalCode || '',
  notes: '',
})

export const createInitialCheckoutState = (account) => ({
  stage: 'cart',
  previewStatus: 'idle',
  preview: null,
  submitting: false,
  order: null,
  errorMessage: '',
  form: createInitialInvoiceCheckoutForm(account),
  fieldErrors: {},
})

export const trimCheckoutValue = (value) => String(value ?? '').trim()

export const validateInvoiceCheckoutForm = (form) => {
  const errors = {}
  const normalizedPhoneNumber = normalizePhoneNumber(form.contactPhone || '')
  const normalizedPostalCode = String(form.postalCode ?? '').replace(/\D/g, '').slice(0, 4)

  if (!trimCheckoutValue(form.recipientName)) {
    errors.recipientName = 'Enter the billing recipient name.'
  }

  const emailError = validateEmail(form.email || '')
  if (emailError) {
    errors.email = emailError
  }

  if (normalizedPhoneNumber) {
    const phoneError = validatePhoneNumber(normalizedPhoneNumber)
    if (phoneError) {
      errors.contactPhone = phoneError
    }
  }

  if (!trimCheckoutValue(form.addressLine1)) {
    errors.addressLine1 = 'Enter the billing street address.'
  }

  if (!trimCheckoutValue(form.city)) {
    errors.city = 'Enter the billing city.'
  }

  if (!trimCheckoutValue(form.province)) {
    errors.province = 'Enter the billing province.'
  }

  if (normalizedPostalCode && normalizedPostalCode.length !== 4) {
    errors.postalCode = 'Use a 4-digit postal code.'
  }

  return errors
}

export const buildInvoiceCheckoutPayload = (form) => {
  const normalizedPhoneNumber = normalizePhoneNumber(form.contactPhone || '')
  const normalizedPostalCode = String(form.postalCode ?? '').replace(/\D/g, '').slice(0, 4)

  return {
    recipientName: trimCheckoutValue(form.recipientName),
    email: normalizeEmail(form.email || ''),
    contactPhone: normalizedPhoneNumber || undefined,
    addressLine1: trimCheckoutValue(form.addressLine1),
    addressLine2: trimCheckoutValue(form.addressLine2) || undefined,
    city: trimCheckoutValue(form.city),
    province: trimCheckoutValue(form.province),
    postalCode: normalizedPostalCode || undefined,
  }
}

export const buildCheckoutAddressLabel = (address) =>
  [
    address?.addressLine1,
    address?.addressLine2,
    address?.city,
    address?.province,
    address?.postalCode,
  ]
    .map((value) => trimCheckoutValue(value))
    .filter(Boolean)
    .join(', ')
