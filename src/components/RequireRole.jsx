import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomePathForRole, normalizeRole } from '../utils/token'

export default function RequireRole({ role, children }) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const requiredRole = normalizeRole(role)
  const currentRole = normalizeRole(user?.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole && currentRole !== requiredRole) {
    const home = getHomePathForRole(currentRole)
    if (home) return <Navigate to={home} replace />
    return <Navigate to="/" replace />
  }

  return children
}
