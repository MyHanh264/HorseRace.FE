import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setOnUnauthorized } from '../services/api'

export default function AuthSessionSync() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()

  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession()
      navigate('/login', { replace: true })
    })
  }, [clearSession, navigate])

  return null
}
