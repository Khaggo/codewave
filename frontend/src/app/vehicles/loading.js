export default function VehiclesLoading() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-10 bg-surface-card border border-surface-border rounded-lg w-64 animate-pulse" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 w-16 bg-surface-card rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-40 bg-surface-card rounded-lg animate-pulse ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden">
        <div className="bg-surface-raised px-5 py-3.5">
          <div className="flex gap-16">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="h-3 w-16 bg-surface-hover rounded animate-pulse" />
            ))}
          </div>
        </div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="px-5 py-4 border-t border-surface-border flex gap-16">
            {[1,2,3,4,5,6,7].map(j => (
              <div key={j} className="h-3.5 bg-surface-raised rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%`, minWidth: 48 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
