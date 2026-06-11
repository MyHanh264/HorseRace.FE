import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { logoutUser } from '../api/auth'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  getRoleFromPayload,
  normalizeRole,
  parseJwtPayload,
  setAuthTokens,
} from '../utils/token'

const AuthContext = createContext(null)

function userFromLoginData(data) {
  return {
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
    role: normalizeRole(data.role),
  }
}

function userFromToken(token) {
  const payload = parseJwtPayload(token)
  if (!payload) return null

  return {
    userId: Number(payload.sub),
    email: payload.email,
    fullName: payload.fullName || payload.fullname || payload.name || '',
    role: getRoleFromPayload(payload),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = getAccessToken()
    return token ? userFromToken(token) : null
  })

  const login = useCallback((data, remember = true) => {
    const { accessToken, refreshToken } = data
    setAuthTokens({ accessToken, refreshToken, remember })
    setUser(userFromLoginData(data))
  }, [])

  const clearSession = useCallback(() => {
    clearAuthTokens()
    setUser(null)
  }, [])

  const logout = useCallback(async () => {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()

    try {
      if (accessToken && refreshToken) {
        await logoutUser({ accessToken, refreshToken })
      }
    } catch {
      /* clear local session even if API fails */
    } finally {
      clearSession()
    }
  }, [clearSession])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    setUser(userFromToken(token))
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      login,
      logout,
      clearSession,
    }),
    [user, login, logout, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
