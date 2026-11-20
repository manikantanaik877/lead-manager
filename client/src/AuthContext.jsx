import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // While a stored token is being verified we don't know yet whether to show login or the app.
  const [booting, setBooting] = useState(() => Boolean(tokenStore.get()))

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false))
  }, [logout])

  const authenticate = useCallback(async (mode, credentials) => {
    const { token, user } = await api[mode](credentials)
    tokenStore.set(token)
    setUser(user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      booting,
      login: (c) => authenticate('login', c),
      signup: (c) => authenticate('signup', c),
      logout,
    }),
    [user, booting, authenticate, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
