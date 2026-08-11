import PaymentReturnPage from '@/components/public/PaymentReturnPage'

export const metadata = { title: 'Payment status' }

export default function PaymentCancelPage() {
  return <PaymentReturnPage flow="booking" outcome="cancel" />
}
