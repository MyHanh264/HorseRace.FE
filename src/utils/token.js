export function normalizeRole(role) {
  return role ? String(role).trim().toUpperCase() : null
}

const ROLE_CLAIM =
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

export function getRoleFromPayload(payload) {
  if (!payload) return null
  return normalizeRole(payload.role || payload[ROLE_CLAIM])
}

export function getHomePathForRole(role) {
  switch (normalizeRole(role)) {
    case 'ADMIN':
      return '/admin'
    case 'SPECTATOR':
      return '/spectator'
    case 'JOCKEY':
      return '/jockey'
    case 'HORSE_OWNER':
      return '/horse-owner'
    case 'REFEREE':
      return '/referee'
    default:
      return null
  }
}

export function getAccessToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || ''
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || ''
}

export function clearAuthTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
}

/** Ghi token vào đúng một nơi — tránh token cũ trong localStorage gây sai role */
export function setAuthTokens({ accessToken, refreshToken, remember }) {
  clearAuthTokens()
  const store = remember ? localStorage : sessionStorage
  store.setItem('accessToken', accessToken)
  if (refreshToken) store.setItem('refreshToken', refreshToken)
}

export function parseJwtPayload(token) {
  if (!token) return null
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function getStoredAuthRole() {
  return getRoleFromPayload(parseJwtPayload(getAccessToken()))
}

export function isRememberedSession() {
  return Boolean(localStorage.getItem('accessToken'))
}
