import PaymentReturnPage from '@/components/public/PaymentReturnPage'

export const metadata = { title: 'Payment status' }

export default function PaymentSuccessPage() {
  return <PaymentReturnPage flow="booking" outcome="success" />
}
