'use client'

import { useEffect, useState } from 'react'

import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Login from '@/screens/Login'
import { UserProvider } from '@/lib/userContext'
import {
  clearStoredSession,
  fetchAuthenticatedUser,
  loadStoredSession,
  refreshAuthSession,
  saveStoredSession,
} from '@/lib/authClient'
import {
  getStaffPortalAccessState,
  isActiveStaffPortalState,
  staffPortalStateMessages,
} from '@/lib/api/generated/auth/staff-web-session'

export default function AppShell({ children }) {
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
        await fetchAuthenticatedUser(savedSession.accessToken)
        if (isMounted) {
          const accessState = getStaffPortalAccessState(savedSession?.user)
          if (isActiveStaffPortalState(accessState)) {
            setSession(savedSession)
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
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
