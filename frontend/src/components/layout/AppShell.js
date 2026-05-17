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
  STAFF_SESSION_UNAUTHORIZED_EVENT,
  refreshAuthSession,
  saveStoredSession,
  updateStaffPortalProfile,
} from '@/lib/authClient'
import {
  getStaffPortalAccessState,
  isActiveStaffPortalState,
  staffPortalStateMessages,
} from '@/lib/api/generated/auth/staff-web-session'
import { getStaffPortalRouteGuardDecision } from '@/lib/api/generated/auth/client-surface-guardrails'
import { getSidebarWidth } from './layoutShellView.mjs'

function StaffRouteGuardState({ guard, onLogout }) {
  const suggestedRoutes = guard.allowedNavigation.slice(0, 4)

  return (
    <div className="empty-panel mx-auto max-w-3xl p-8 text-left shadow-card-md">
      <div className="badge badge-orange">
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
                className="btn-ghost min-h-10"
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
            className="btn-primary"
          >
            Open allowed workspace
          </PortalLink>
        ) : null}
        <button
          onClick={onLogout}
          className="btn-ghost"
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleUnauthorizedSession = () => {
      clearStoredSession()
      setSession(null)
      setAuthError(staffPortalStateMessages.session_restore_failed)
    }

    window.addEventListener(STAFF_SESSION_UNAUTHORIZED_EVENT, handleUnauthorizedSession)
    return () => window.removeEventListener(STAFF_SESSION_UNAUTHORIZED_EVENT, handleUnauthorizedSession)
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

  async function handleUserProfileUpdate(profileUpdates) {
    if (!session?.user?.id || !session?.accessToken) {
      throw new Error('Sign in again before saving profile changes.')
    }

    const updatedUser = await updateStaffPortalProfile({
      userId: session.user.id,
      accessToken: session.accessToken,
      firstName: profileUpdates?.firstName,
      lastName: profileUpdates?.lastName,
      phoneNumber: profileUpdates?.phone,
    })

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        ...updatedUser,
      },
    }

    setSession(nextSession)
    saveStoredSession(nextSession)
    return nextSession.user
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
        <div className="empty-panel max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">Restoring Session</p>
          <p className="mt-3 text-lg font-semibold text-ink-primary">Loading the staff workspace...</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Reconnecting your portal session and checking available workspaces.
          </p>
        </div>
      </div>
    )
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

  const sidebarWidth = getSidebarWidth(collapsed)
  const sidebarWidthStyle = {
    width: `${sidebarWidth}px`,
  }
  const sidebarSpacerStyle = {
    width: `${sidebarWidth}px`,
    flexBasis: `${sidebarWidth}px`,
  }

  return (
    <UserProvider user={providerUser} updateUser={handleUserProfileUpdate}>
      <div className="flex h-screen flex-col overflow-hidden bg-surface-bg md:flex-row">
        {mobileOpen ? (
          <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-30 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 md:translate-x-0`}
          style={sidebarWidthStyle}
        >
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        </div>

        <div className="hidden md:block md:flex-shrink-0" style={sidebarSpacerStyle} aria-hidden="true" />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200">
          <Topbar user={providerUser} onMenuToggle={() => setMobileOpen((value) => !value)} onLogout={handleLogout} />
          <main className="cc-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
            <div className="mx-auto w-full min-w-0 max-w-[1500px] animate-fade-in">
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
