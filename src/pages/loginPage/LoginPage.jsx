import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getHomePathForRole } from '../../utils/token'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, login } = useAuth()

  const [email, setEmail] = useState(() => location.state?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) return
    const home = getHomePathForRole(user?.role)
    if (home) navigate(home, { replace: true })
  }, [isAuthenticated, user?.role, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Invalid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setSubmitting(true)
    try {
      const data = await loginUser({ email: email.trim(), password })
      login(data, remember)

      const home = getHomePathForRole(data.role)
      if (home) {
        navigate(home, { replace: true, state: { loginSuccess: true } })
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left visual panel */}
      <div className="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1200&q=80"
          alt="Horse Racing"
          className="auth-visual-img"
          referrerPolicy="no-referrer"
        />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <p className="auth-visual-eyebrow">Horse Race Management Platform</p>
          <h1 className="auth-visual-title">Where Champions Are Born</h1>
          <p className="auth-visual-desc">
            Join GrandStride — manage your stable, track races, and cement your legend.
          </p>
          <div className="flex flex-wrap gap-6 mt-2">
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">1,200+</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Athletes</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">48</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Races</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">5</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Roles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel">
        <div className="w-full flex flex-col gap-6">
          {/* Brand */}
          <div className="text-center mb-2">
            <button
              onClick={() => navigate('/')}
              className="font-serif text-3xl text-primary font-bold tracking-tight hover:opacity-90 active:scale-[0.98] transition-all bg-transparent border-none cursor-pointer"
            >
              GrandStride
            </button>
            <p className="text-sm text-on-surface-variant mt-1 font-medium">Log in to your account</p>
          </div>

          {/* Card */}
          <div className="login-card w-full rounded-2xl p-8 flex flex-col gap-5">
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="auth-alert auth-alert--error" role="alert">
                  {error}
                </div>
              ) : null}

              {/* Email */}
              <div className="auth-form-field">
                <span htmlFor="email">Email Address</span>
                <div className="relative input-focus-gold border border-outline-variant/30 rounded-xl bg-surface-container-lowest flex items-center px-4">
                  <Mail className="w-5 h-5 text-on-surface-variant/60 mr-3 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setError(''); setEmail(e.target.value) }}
                    placeholder="champion@grandstride.com"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-form-field">
                <div className="flex justify-between items-center">
                  <span htmlFor="password">Password</span>
                  <Link
                    to="/forgot-password"
                    state={{ email: email.trim() }}
                    className="text-xs text-secondary hover:underline font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative input-focus-gold border border-outline-variant/30 rounded-xl bg-surface-container-lowest flex items-center px-4">
                  <Lock className="w-5 h-5 text-on-surface-variant/60 mr-3 shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setError(''); setPassword(e.target.value) }}
                    placeholder="Enter your password"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none text-on-surface-variant/60 hover:text-secondary p-1 bg-transparent border-none cursor-pointer transition-colors shrink-0 ml-2"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center gap-2.5">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-outline-variant/40 text-secondary bg-surface-container-lowest focus:ring-secondary/40 w-4 h-4 accent-secondary cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-on-surface-variant cursor-pointer select-none font-medium">
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="auth-btn auth-btn--primary mt-1 py-3.5 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>Log In</>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-outline-variant/10">
              <p className="text-xs text-on-surface-variant">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-secondary font-bold hover:underline cursor-pointer bg-transparent border-none transition-colors"
                >
                  Sign up now
                </button>
              </p>
            </div>
          </div>

          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="mx-auto flex items-center gap-2 text-on-surface-variant/60 hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-none text-xs font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
