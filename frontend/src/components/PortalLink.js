'use client'

import Link from 'next/link'

import { getPortalLinkKind } from './portalLinkModel.mjs'

export default function PortalLink({ href, children, ...props }) {
  if (getPortalLinkKind(href) === 'anchor') {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}
