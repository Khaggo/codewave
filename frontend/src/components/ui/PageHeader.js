const joinClassNames = (...values) => values.filter(Boolean).join(' ')

export default function PageHeader({
  eyebrow,
  title,
  description,
  meta = null,
  actions = null,
  className = '',
}) {
  return (
    <header
      className={joinClassNames(
        'flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card/80 px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur sm:px-6',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink-muted">{eyebrow}</p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-6 text-ink-secondary sm:text-base">{description}</p> : null}
          </div>
          {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
