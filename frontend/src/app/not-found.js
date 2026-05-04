import PortalLink from '@/components/PortalLink'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm space-y-4">
        <p className="text-7xl font-black" style={{ color: '#f07c00' }}>404</p>
        <div>
          <h2 className="text-lg font-bold text-ink-primary">Page Not Found</h2>
          <p className="text-sm text-ink-secondary mt-2">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <PortalLink href="/" className="btn-primary inline-flex">
          Back to Dashboard
        </PortalLink>
      </div>
    </div>
  )
}
