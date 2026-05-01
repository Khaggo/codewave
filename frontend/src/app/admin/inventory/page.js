import InventoryWorkspace from '@/screens/InventoryWorkspace'
import EcommerceUnavailableCard from '@/components/EcommerceUnavailableCard'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

export const metadata = { title: 'Admin Inventory' }

export default function AdminInventoryPage() {
  if (!isEcommerceEnabled()) {
    return <EcommerceUnavailableCard title="Inventory Admin is offline on the cheapest deployment" />
  }

  return <InventoryWorkspace />
}
