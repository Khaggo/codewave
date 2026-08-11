import PaymentReturnPage from '@/components/public/PaymentReturnPage'

export const metadata = { title: 'Accessory order payment status' }

export default function AccessoryPaymentSuccessPage() {
  return <PaymentReturnPage flow="accessory" outcome="success" />
}
