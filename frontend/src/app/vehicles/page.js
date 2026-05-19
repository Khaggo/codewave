import { redirect } from 'next/navigation'

export const metadata = { title: 'Customers & Vehicles' }

export default function VehicleRecordsPage() {
  redirect('/admin/customers')
}
