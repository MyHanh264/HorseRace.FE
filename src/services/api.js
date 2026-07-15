import axios from 'axios'
import { refreshAuthToken } from '../api/auth'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isRememberedSession,
  parseJwtPayload,
  setAuthTokens,
} from '../utils/token'

const TOKEN_REFRESH_BUFFER_SECONDS = 60

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

let refreshPromise = null
let onUnauthorized = null

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

function hasUsableAccessToken(token) {
  if (!token) return false

  const payload = parseJwtPayload(token)
  if (!payload?.exp) return true

  const secondsLeft = payload.exp - Math.floor(Date.now() / 1000)
  return secondsLeft > TOKEN_REFRESH_BUFFER_SECONDS
}

async function refreshStoredAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAuthTokens()
    onUnauthorized?.()
    throw new Error('Session expired.')
  }

  try {
    if (!refreshPromise) {
      refreshPromise = refreshAuthToken(refreshToken).finally(() => {
        refreshPromise = null
      })
    }

    const data = await refreshPromise
    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      remember: isRememberedSession(),
    })

    return data.accessToken
  } catch (refreshError) {
    clearAuthTokens()
    onUnauthorized?.()
    throw refreshError
  }
}

/** Return an access token that is still valid long enough for a new request/reconnect. */
export async function getValidAccessToken({ forceRefresh = false } = {}) {
  const token = getAccessToken()
  if (!forceRefresh && hasUsableAccessToken(token)) {
    return token
  }

  return refreshStoredAccessToken()
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuthTokens()
      onUnauthorized?.()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const accessToken = await getValidAccessToken({ forceRefresh: true })
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

export default api
