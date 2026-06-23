import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomePathForRole, normalizeRole } from '../utils/token'

export default function RequireRole({ role, children }) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 200)
    return () => clearTimeout(timer)
  }, [])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1117" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span style={{ color: "#8B949E", fontSize: "13px" }}>Checking access...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role) {
    const requiredRole = normalizeRole(role)
    const currentRole = normalizeRole(user?.role)

    const match =
      currentRole === requiredRole ||
      (currentRole && requiredRole && currentRole.includes(requiredRole)) ||
      (requiredRole === 'ADMIN' && currentRole === 'SUPER_ADMIN')

    if (!match) {
      const home = getHomePathForRole(currentRole)
      if (home) return <Navigate to={home} replace />
      return <Navigate to="/" replace />
    }
  }

  return children
}
