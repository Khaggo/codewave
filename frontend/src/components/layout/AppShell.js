'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import PortalLink from '@/components/PortalLink'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Login from '@/screens/Login'
import { UserProvider } from '@/lib/userContext'
import {
  clearStoredSession,
  loadStoredSession,
  STAFF_SESSION_UNAUTHORIZED_EVENT,
  refreshAuthSession,
  saveStoredSession,
  updateStaffPortalProfile,
} from '@/lib/authClient'
import { requireAuthoritativeStaffPhone } from '@/lib/staffProfileSession.mjs'
import {
  getStaffPortalAccessState,
  isActiveStaffPortalState,
  staffPortalStateMessages,
} from '@/lib/api/generated/auth/staff-web-session'
import { getStaffPortalRouteGuardDecision } from '@/lib/api/generated/auth/client-surface-guardrails'
import { getSidebarWidth } from './layoutShellView.mjs'
import { isPublicPaymentReturnRoute } from './publicPaymentRouteAccess.mjs'
import {
  heartbeatStaffWorkClaim,
  listStaffWorkQueue,
} from '@/lib/staffWorkQueueClient'

const STAFF_SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000

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
  const [jobWorkState, setJobWorkState] = useState({
    item: null,
    summary: { mine: 0, blocked: 0, overdue: 0 },
    session: { currentClaimId: null, currentClaim: null },
  })
  const sessionRef = useRef(null)
  const sessionRefreshInFlightRef = useRef(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    const accessToken = session?.accessToken
    if (!accessToken) {
      setJobWorkState({
        item: null,
        summary: { mine: 0, blocked: 0, overdue: 0 },
        session: { currentClaimId: null, currentClaim: null },
      })
      return undefined
    }

    let active = true
    const loadWorkState = async () => {
      try {
        const [result, qaResult] = await Promise.all([
          listStaffWorkQueue({
            queueType: 'job_order',
            accessToken,
            view: 'my',
            limit: 25,
          }),
          listStaffWorkQueue({
            queueType: 'qa',
            accessToken,
            view: 'my',
            limit: 25,
          }),
        ])
        if (!active) return
        const item = (result?.items ?? []).find((entry) => entry.claim?.isMine) ?? result?.items?.[0] ?? null
        setJobWorkState({
          item,
          summary: result?.summary ?? { mine: 0, blocked: 0, overdue: 0 },
          session: result?.session ?? { currentClaimId: null, currentClaim: null },
        })
        const claims = [
          ...(result?.session?.activeClaims ?? []),
          ...(qaResult?.session?.activeClaims ?? []),
        ]
        await Promise.allSettled(
          claims.map((claim) => heartbeatStaffWorkClaim({
            claimId: claim.id,
            accessToken,
          })),
        )
      } catch {
        // Keep the shell usable if the operational queue is temporarily unavailable.
      }
    }

    void loadWorkState()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadWorkState()
    }, 15_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [session?.accessToken])

  const applyBlockedAccess = useCallback((state) => {
    clearStoredSession()
    setSession(null)
    setAuthError(staffPortalStateMessages[state] ?? '')
  }, [])

  const refreshPortalSession = useCallback(async (sessionOverride = null) => {
    if (sessionRefreshInFlightRef.current) {
      return sessionRefreshInFlightRef.current
    }

    const currentSession = sessionOverride ?? sessionRef.current ?? loadStoredSession()
    if (!currentSession?.refreshToken) {
      clearStoredSession()
      setSession(null)
      setAuthError(staffPortalStateMessages.session_restore_failed)
      return null
    }

    const refreshPromise = (async () => {
      const refreshedSession = await refreshAuthSession(currentSession.refreshToken)
      const accessState = getStaffPortalAccessState(refreshedSession?.user)

      if (!isActiveStaffPortalState(accessState)) {
        applyBlockedAccess(accessState)
        return null
      }

      saveStoredSession(refreshedSession)
      setSession(refreshedSession)
      setAuthError('')
      return refreshedSession
    })()

    sessionRefreshInFlightRef.current = refreshPromise

    try {
      return await refreshPromise
    } catch (error) {
      clearStoredSession()
      setSession(null)
      setAuthError(staffPortalStateMessages.session_restore_failed)
      throw error
    } finally {
      sessionRefreshInFlightRef.current = null
    }
  }, [applyBlockedAccess])

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const savedSession = loadStoredSession()
      if (!savedSession) {
        if (isMounted) setAuthReady(true)
        return
      }

      try {
        const restoredSession = await refreshPortalSession(savedSession)
        if (isMounted && !restoredSession) setSession(null)
      } catch {
        if (isMounted) setSession(null)
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
  }, [applyBlockedAccess, refreshPortalSession])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleUnauthorizedSession = () => {
      void refreshPortalSession().catch(() => {})
    }

    window.addEventListener(STAFF_SESSION_UNAUTHORIZED_EVENT, handleUnauthorizedSession)
    return () => window.removeEventListener(STAFF_SESSION_UNAUTHORIZED_EVENT, handleUnauthorizedSession)
  }, [refreshPortalSession])

  useEffect(() => {
    if (!session?.refreshToken || !session?.user) {
      return undefined
    }

    const accessState = getStaffPortalAccessState(session.user)
    if (!isActiveStaffPortalState(accessState)) {
      return undefined
    }

    const refreshInterval = setInterval(() => {
      void refreshPortalSession(session).catch(() => {})
    }, STAFF_SESSION_REFRESH_INTERVAL_MS)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [session, refreshPortalSession])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const refreshWhenInteractive = () => {
      const currentSession = sessionRef.current
      if (!currentSession?.refreshToken || !currentSession?.user) {
        return
      }

      const accessState = getStaffPortalAccessState(currentSession.user)
      if (!isActiveStaffPortalState(accessState)) {
        return
      }

      void refreshPortalSession(currentSession).catch(() => {})
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshWhenInteractive()
      }
    }

    window.addEventListener('focus', refreshWhenInteractive)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refreshWhenInteractive)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshPortalSession])

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

    if (profileUpdates?.confirmedPhone) {
      const confirmedPhone = requireAuthoritativeStaffPhone(
        profileUpdates.confirmedUser,
        profileUpdates.confirmedPhone,
      )
      const refreshedSession = await refreshPortalSession(session)
      if (!refreshedSession?.user) {
        throw new Error('The updated profile could not be reloaded from the server.')
      }
      requireAuthoritativeStaffPhone(refreshedSession.user, confirmedPhone)
      return refreshedSession.user
    }

    if (profileUpdates?.profileSnapshot) {
      const nextSession = {
        ...session,
        user: {
          ...session.user,
          profile: profileUpdates.profileSnapshot,
          name: [profileUpdates.profileSnapshot?.firstName, profileUpdates.profileSnapshot?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || session.user.name,
        },
      }

      setSession(nextSession)
      saveStoredSession(nextSession)
      return nextSession.user
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

  if (isPublicPaymentReturnRoute(pathname)) {
    return children
  }

  if (!authReady) {
    return <Login restoring />
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
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            jobWorkCount={jobWorkState.summary?.mine ?? (jobWorkState.item ? 1 : 0)}
          />
        </div>

        <div className="hidden md:block md:flex-shrink-0" style={sidebarSpacerStyle} aria-hidden="true" />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200">
          <Topbar
            user={providerUser}
            workState={jobWorkState}
            onMenuToggle={() => setMobileOpen((value) => !value)}
            onLogout={handleLogout}
          />
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
