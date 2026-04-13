'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import Login   from '@/screens/Login'
import { UserProvider } from '@/lib/userContext'
import {
  clearStoredSession,
  fetchAuthenticatedUser,
  loadStoredSession,
  refreshAuthSession,
  saveStoredSession,
} from '@/lib/authClient'

export default function AppShell({ children }) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session,    setSession]    = useState(null)
  const [authReady,  setAuthReady]  = useState(false)

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const savedSession = loadStoredSession()
      if (!savedSession) {
        if (isMounted) setAuthReady(true)
        return
      }

      try {
        await fetchAuthenticatedUser(savedSession.accessToken)
        if (isMounted) {
          setSession(savedSession)
        }
      } catch {
        try {
          const refreshedSession = await refreshAuthSession(savedSession.refreshToken)
          saveStoredSession(refreshedSession)

          if (isMounted) {
            setSession(refreshedSession)
          }
        } catch {
          clearStoredSession()
          if (isMounted) {
            setSession(null)
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
    setSession(nextSession)
    saveStoredSession(nextSession)
  }

  function handleLogout() {
    setSession(null)
    clearStoredSession()
  }

  if (!authReady) {
    return <div className="min-h-screen bg-surface-bg" />
  }

  if (!session?.user) return <Login onAuthenticated={handleAuthenticated} />

  const user = session.user

  const sidebarW = collapsed ? 'md:pl-[60px]' : 'md:pl-56'

  return (
    /* Root: full viewport, no overflow — only <main> scrolls */
    <div className="h-screen overflow-hidden bg-surface-bg flex flex-col">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — fixed to left edge, full height */}
      <div className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      </div>

      {/* Right column: topbar + scrollable content */}
      <div className={`flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-200 ${sidebarW}`}>
        <Topbar user={user} onMenuToggle={() => setMobileOpen(v => !v)} onLogout={handleLogout} />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 cc-scrollbar">
          <UserProvider user={user}>
            <div className="animate-fade-in">
              {children}
            </div>
          </UserProvider>
        </main>
      </div>
    </div>
  )
}
