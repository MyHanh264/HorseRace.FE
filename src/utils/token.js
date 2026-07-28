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

/** Write the token to exactly one place — avoids a stale token in localStorage causing the wrong role */
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
    // atob() only understands Latin-1 — each byte of a multi-byte UTF-8 sequence (e.g. Vietnamese
    // diacritics in fullName) comes out as its own mangled character ("Trần" -> "Tráº§n") unless
    // re-decoded as UTF-8 here.
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder('utf-8').decode(bytes))
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
