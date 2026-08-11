const PUBLIC_PAYMENT_RETURN_ROUTES = new Set([
  '/payments/success',
  '/payments/cancel',
  '/accessories/payment/success',
  '/accessories/payment/cancel',
])

export function isPublicPaymentReturnRoute(pathname) {
  return PUBLIC_PAYMENT_RETURN_ROUTES.has(pathname)
}
