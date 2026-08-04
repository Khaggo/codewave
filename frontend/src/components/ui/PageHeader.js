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
        'page-header-surface',
        className,
      )}
    >
      <div className="page-header">
        <div className="page-header-content">
          {eyebrow ? <p className="page-header-eyebrow">{eyebrow}</p> : null}
          <div className="page-header-copy">
            <h1 className="page-header-title">{title}</h1>
            {description ? <p className="page-header-description">{description}</p> : null}
          </div>
          {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
        </div>

        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  )
}
