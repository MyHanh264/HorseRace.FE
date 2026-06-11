import axios from 'axios'
import { refreshAuthToken } from '../api/auth'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isRememberedSession,
  setAuthTokens,
} from '../utils/token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

let refreshPromise = null
let onUnauthorized = null

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
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

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      clearAuthTokens()
      onUnauthorized?.()
      return Promise.reject(refreshError)
    }
  },
)

export default api
