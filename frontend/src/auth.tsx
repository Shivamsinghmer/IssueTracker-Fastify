import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { User } from './types'

const TOKEN_KEY = 'trackr_token'
const USER_KEY = 'trackr_user'

interface AuthContextValue {
  token: string | null
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  const persist = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await api<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      const me = await api<User>('/auth/me', { token: data.access_token })
      persist(data.access_token, me)
    },
    [persist],
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await api<User>('/auth/register', { method: 'POST', body: { username, email, password } })
      await login(username, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((nextUser: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({ token, user, login, register, logout, updateUser }),
    [token, user, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
