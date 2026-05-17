import { redirect } from 'next/navigation'

export const metadata = { title: 'Admin Appointments' }

export default function AdminAppointmentsPage() {
  redirect('/bookings')
}
