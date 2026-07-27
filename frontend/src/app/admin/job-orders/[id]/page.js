import JobOrderWorkbench from '@/screens/JobOrderWorkbench'

export const metadata = {
  title: 'Job Order Workspace',
}

export default async function JobOrderWorkspacePage({ params, searchParams }) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  return (
    <JobOrderWorkbench
      initialJobOrderId={resolvedParams.id}
      initialClaimId={resolvedSearchParams?.claimId ?? ''}
      workspaceOnly
    />
  )
}
