export default function BookingsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit">
        <div className="h-9 w-32 bg-surface-raised rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-surface-raised rounded-lg animate-pulse" />
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <div className="h-4 w-32 bg-surface-raised rounded animate-pulse" />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="px-5 py-4 border-b border-surface-border flex gap-8">
            {[1,2,3,4,5,6].map(j => (
              <div key={j} className="h-3.5 bg-surface-raised rounded animate-pulse flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
