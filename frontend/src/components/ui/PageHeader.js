export default function PageHeader({
  eyebrow,
  title,
  description,
  actions = null,
  meta = null,
}) {
  return (
    <section className="page-header">
      <div className="min-w-0 flex-1 space-y-3">
        {eyebrow ? <p className="page-header-eyebrow">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h1 className="page-header-title">{title}</h1>
          {description ? <p className="page-header-description">{description}</p> : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>

      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  )
}
