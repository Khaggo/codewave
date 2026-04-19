'use client'

import { createContext, useContext, useMemo } from 'react'

const emptyUserContext = {
  user: null,
  updateUser: () => {},
}

const UserContext = createContext(emptyUserContext)

export function UserProvider({ user, updateUser = emptyUserContext.updateUser, children }) {
  const value = useMemo(() => ({ user, updateUser }), [user, updateUser])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)?.user ?? null
}

export function useUserContext() {
  return useContext(UserContext) ?? emptyUserContext
}
