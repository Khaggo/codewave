import EcommerceUnavailableCard from '@/components/EcommerceUnavailableCard'
import ShopProductAdmin from '@/screens/ShopProductAdmin'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

export const metadata = { title: 'Catalog Admin' }

export default function AdminCatalogPage() {
  if (!isEcommerceEnabled()) {
    return <EcommerceUnavailableCard title="Product Catalog Admin is waiting for the ecommerce runtime" />
  }

  return <ShopProductAdmin />
}
