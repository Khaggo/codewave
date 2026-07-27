import JobOrdersOperationsBoard from '@/screens/JobOrdersOperationsBoard'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Job Order Operations',
}

export default async function JobOrdersPage({ searchParams }) {
  const resolvedSearchParams = await searchParams
  const legacyJobOrderId = resolvedSearchParams?.jobOrderId

  if (legacyJobOrderId) {
    redirect(`/admin/job-orders/${encodeURIComponent(legacyJobOrderId)}`)
  }

  return <JobOrdersOperationsBoard />
}
