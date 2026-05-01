import BookingServiceAdmin from '@/components/BookingServiceAdmin'
import EcommerceUnavailableCard from '@/components/EcommerceUnavailableCard'
import ShopProductAdmin from '@/screens/ShopProductAdmin'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

export const metadata = { title: 'Catalog Admin' }

export default function AdminCatalogPage() {
  if (!isEcommerceEnabled()) {
    return (
      <div className="space-y-8">
        <BookingServiceAdmin />
        <EcommerceUnavailableCard title="Product Catalog Admin is offline on the cheapest deployment" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <BookingServiceAdmin />
      <ShopProductAdmin />
    </div>
  )
}
