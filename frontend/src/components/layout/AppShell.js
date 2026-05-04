'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import PortalLink from '@/components/PortalLink'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Login from '@/screens/Login'
import { UserProvider } from '@/lib/userContext'
import {
  clearStoredSession,
  fetchAuthenticatedUser,
  hydrateStoredSessionFromAuthenticatedUser,
  loadStoredSession,
  refreshAuthSession,
  saveStoredSession,
} from '@/lib/authClient'
import {
  getStaffPortalAccessState,
  isActiveStaffPortalState,
  staffPortalStateMessages,
} from '@/lib/api/generated/auth/staff-web-session'
import { getStaffPortalRouteGuardDecision } from '@/lib/api/generated/auth/client-surface-guardrails'

function StaffRouteGuardState({ guard, onLogout }) {
  const suggestedRoutes = guard.allowedNavigation.slice(0, 4)

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card-md">
      <div className="inline-flex rounded-full bg-[rgba(240,124,0,0.12)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f07c00]">
        Role Guardrail
      </div>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-ink-primary">
        This workspace is not available for your role.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">{guard.message}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-dim">
        Blocked page: {guard.pathname}
      </p>

      {suggestedRoutes.length ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink-primary">Available workspaces</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {suggestedRoutes.map((entry) => (
              <PortalLink
                key={entry.href}
                href={entry.href}
                className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
              >
                {entry.label}
              </PortalLink>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {guard.fallbackHref ? (
          <PortalLink
            href={guard.fallbackHref}
            className="rounded-xl bg-[#f07c00] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Open allowed workspace
          </PortalLink>
        ) : null}
        <button
          onClick={onLogout}
          className="rounded-xl border border-surface-border px-4 py-2 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true

    const applyBlockedAccess = (state) => {
      clearStoredSession()
      setSession(null)
      setAuthError(staffPortalStateMessages[state] ?? '')
    }

    const restoreSession = async () => {
      const savedSession = loadStoredSession()
      if (!savedSession) {
        if (isMounted) setAuthReady(true)
        return
      }

      try {
        const authenticatedUser = await fetchAuthenticatedUser(savedSession.accessToken)
        if (isMounted) {
          const restoredSession = hydrateStoredSessionFromAuthenticatedUser(
            savedSession,
            authenticatedUser,
          )
          const accessState = getStaffPortalAccessState(restoredSession?.user)
          if (isActiveStaffPortalState(accessState)) {
            saveStoredSession(restoredSession)
            setSession(restoredSession)
            setAuthError('')
          } else {
            applyBlockedAccess(accessState)
          }
        }
      } catch {
        try {
          const refreshedSession = await refreshAuthSession(savedSession.refreshToken)

          if (isMounted) {
            const accessState = getStaffPortalAccessState(refreshedSession?.user)
            if (isActiveStaffPortalState(accessState)) {
              saveStoredSession(refreshedSession)
              setSession(refreshedSession)
              setAuthError('')
            } else {
              applyBlockedAccess(accessState)
            }
          }
        } catch {
          clearStoredSession()
          if (isMounted) {
            setSession(null)
            setAuthError(staffPortalStateMessages.session_restore_failed)
          }
        }
      } finally {
        if (isMounted) {
          setAuthReady(true)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  function handleAuthenticated(nextSession) {
    const accessState = getStaffPortalAccessState(nextSession?.user)
    if (!isActiveStaffPortalState(accessState)) {
      setSession(null)
      clearStoredSession()
      setAuthError(staffPortalStateMessages[accessState] ?? '')
      return {
        ok: false,
        message: staffPortalStateMessages[accessState] ?? 'Unable to open the staff portal.',
      }
    }

    setSession(nextSession)
    saveStoredSession(nextSession)
    setAuthError('')
    return {
      ok: true,
    }
  }

  function handleLogout() {
    setSession(null)
    clearStoredSession()
    setAuthError('')
  }

  if (!authReady) {
    return <div className="min-h-screen bg-surface-bg" />
  }

  if (!session?.user) {
    return <Login onAuthenticated={handleAuthenticated} initialError={authError} />
  }

  const providerUser = {
    ...session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  }
  const routeGuard = getStaffPortalRouteGuardDecision({
    pathname,
    sessionUser: providerUser,
  })

  const sidebarW = collapsed ? 'md:pl-[60px]' : 'md:pl-56'

  return (
    <UserProvider user={providerUser}>
      <div className="h-screen overflow-hidden bg-surface-bg flex flex-col">
        {mobileOpen ? (
          <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
        ) : null}

        <div className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200`}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        </div>

        <div className={`flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-200 ${sidebarW}`}>
          <Topbar user={providerUser} onMenuToggle={() => setMobileOpen((value) => !value)} onLogout={handleLogout} />
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 cc-scrollbar">
            <div className="animate-fade-in">
              {routeGuard.status === 'allowed' ? (
                children
              ) : (
                <StaffRouteGuardState guard={routeGuard} onLogout={handleLogout} />
              )}
            </div>
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
