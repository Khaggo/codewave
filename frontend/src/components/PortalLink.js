'use client'

export default function PortalLink({ href, children, ...props }) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}
