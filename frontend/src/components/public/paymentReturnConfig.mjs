const ACCESSORY_RETURN_INSTRUCTION =
  'Close this browser and return to the AUTOCARE mobile app. Open Accessories, then My accessory orders, to check the latest verified status.'

const BOOKING_RETURN_INSTRUCTION =
  'If AUTOCARE does not open, close this browser and return to the mobile app. Open Book to check the latest verified booking status.'

export const PAYMENT_RETURN_CONFIGS = Object.freeze({
  '/payments/success': Object.freeze({
    flow: 'booking',
    outcome: 'success',
    eyebrow: 'Booking payment',
    appHref: 'autocarecc://checkout/booking/success',
    appLabel: 'Open booking status in the AUTOCARE app',
    returnInstruction: BOOKING_RETURN_INSTRUCTION,
  }),
  '/payments/cancel': Object.freeze({
    flow: 'booking',
    outcome: 'cancel',
    eyebrow: 'Booking payment',
    appHref: 'autocarecc://checkout/booking/cancel',
    appLabel: 'Open booking status in the AUTOCARE app',
    returnInstruction: BOOKING_RETURN_INSTRUCTION,
  }),
  '/accessories/payment/success': Object.freeze({
    flow: 'accessory',
    outcome: 'success',
    eyebrow: 'Accessory order payment',
    appHref: null,
    appLabel: null,
    returnInstruction: ACCESSORY_RETURN_INSTRUCTION,
  }),
  '/accessories/payment/cancel': Object.freeze({
    flow: 'accessory',
    outcome: 'cancel',
    eyebrow: 'Accessory order payment',
    appHref: null,
    appLabel: null,
    returnInstruction: ACCESSORY_RETURN_INSTRUCTION,
  }),
})

export function getPaymentReturnConfig(flow, outcome) {
  return Object.values(PAYMENT_RETURN_CONFIGS).find(
    (config) => config.flow === flow && config.outcome === outcome,
  ) ?? null
}
