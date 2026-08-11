import PaymentReturnPage from '@/components/public/PaymentReturnPage'

export const metadata = { title: 'Accessory order payment status' }

export default function AccessoryPaymentCancelPage() {
  return <PaymentReturnPage flow="accessory" outcome="cancel" />
}
