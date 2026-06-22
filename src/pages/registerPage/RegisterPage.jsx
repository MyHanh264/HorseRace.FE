import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../api/auth'
import { getAccessToken, getHomePathForRole, getStoredAuthRole } from '../../utils/token'
import { ArrowLeft, UserCheck, Shield, Trophy, CheckCircle, Loader2 } from 'lucide-react'
import './RegisterPage.css'
import GrandNationalPosterArt from '../../assets/GrandNationalPosterArt.jpg'

const PUBLIC_ROLES = [
  {
    code: 'SPECTATOR',
    title: 'Spectator',
    description: 'Watch races, predict results, and earn rewards.',
    icon: '◎',
  },
  {
    code: 'HORSE_OWNER',
    title: 'Horse Owner',
    description: 'Register horses, hire jockeys, and manage schedules.',
    icon: '♞',
  },
  {
    code: 'JOCKEY',
    title: 'Jockey',
    description: 'Receive invitations, confirm rides, and track your career.',
    icon: '⚑',
  },
]

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phoneNumber: '',
  roleCode: 'SPECTATOR',
  licenseNumber: '',
  weight: '',
  bio: '',
}

function validateClient(form) {
  if (!form.email?.includes('@')) return 'Please enter a valid email address.'
  if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.'
  if (form.password !== form.confirmPassword) return 'Passwords do not match.'
  if (!form.fullName?.trim()) return 'Full name is required.'
  if (!form.phoneNumber?.trim()) return 'Phone number is required.'
  if (!PUBLIC_ROLES.some((r) => r.code === form.roleCode)) return 'Invalid role selected.'
  if (form.roleCode === 'JOCKEY') {
    if (!form.licenseNumber?.trim()) return 'License number is required for jockeys.'
    const w = parseFloat(form.weight)
    if (Number.isNaN(w) || w <= 0) return 'Weight must be a valid positive number.'
  }
  return null
}

function buildPayload(form) {
  const payload = {
    email: form.email.trim(),
    password: form.password,
    fullName: form.fullName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    roleCode: form.roleCode,
  }
  if (form.roleCode === 'JOCKEY') {
    payload.licenseNumber = form.licenseNumber.trim()
    payload.weight = parseFloat(form.weight)
    if (form.bio?.trim()) payload.bio = form.bio.trim()
  }
  return payload
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const home = getHomePathForRole(getStoredAuthRole())
    if (getAccessToken() && home) {
      navigate(home, { replace: true })
    }
  }, [navigate])

  const isJockey = form.roleCode === 'JOCKEY'

  const setField = (name, value) => {
    setError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(null)

    const clientError = validateClient(form)
    if (clientError) {
      setError(clientError)
      return
    }

    setSubmitting(true)
    try {
      const user = await registerUser(buildPayload(form))
      setSuccess(user)
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="register-page">
      {/* Left visual panel */}
      <div className="register-visual">
        <img
          src={GrandNationalPosterArt}
          alt="Grand National"
          className="register-visual-img"
          referrerPolicy="no-referrer"
        />
        <div className="register-visual-overlay" />
        <div className="register-visual-content">
          <p className="register-eyebrow">Become a Member</p>
          <h1>Join the World of Horse Racing</h1>
          <p>
            Create your account today and start your journey with GrandStride.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="register-container">
        <div className="register-card">
          <div className="register-card-header">
            <h2>Create New Account</h2>
          </div>

          {success ? (
            <div className="register-success-card">
              {success.requiresApproval ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                    <span className="register-success-badge">Pending Approval</span>
                  </div>
                  <h3>Registration Successful</h3>
                  <p>
                    Your account for <strong>{success.fullName}</strong> is awaiting admin approval.
                  </p>
                  <div className="register-success-actions">
                    <Link
                      className="register-btn register-btn--primary"
                      to="/login"
                      state={{ email: success.email }}
                    >
                      Go to Sign In
                    </Link>
                    <button
                      type="button"
                      className="register-btn register-btn--ghost"
                      onClick={() => setSuccess(null)}
                    >
                      Register Another Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <span className="register-success-badge" style={{ background: 'rgba(141,214,166,0.15)', color: 'var(--color-primary)', borderColor: 'rgba(141,214,166,0.3)' }}>Success</span>
                  </div>
                  <h3>Registration Complete</h3>
                  <p>
                    Welcome, <strong>{success.fullName}</strong>. Email: <strong>{success.email}</strong>. Sign in to continue.
                  </p>
                  <div className="register-success-actions">
                    <Link
                      className="register-btn register-btn--primary"
                      to="/login"
                      state={{ email: success.email }}
                    >
                      Sign In Now
                    </Link>
                    <button
                      type="button"
                      className="register-btn register-btn--ghost"
                      onClick={() => setSuccess(null)}
                    >
                      Register Another Account
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form className="register-form" onSubmit={onSubmit} noValidate>
              {/* Role selector */}
              <fieldset className="register-fieldset">
                <legend>Select a Role</legend>
                <div className="register-role-grid">
                  {PUBLIC_ROLES.map((role) => (
                    <label
                      key={role.code}
                      className={`register-role-card${form.roleCode === role.code ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="roleCode"
                        value={role.code}
                        checked={form.roleCode === role.code}
                        onChange={() => setField('roleCode', role.code)}
                      />
                      <span className="register-role-icon" aria-hidden="true">
                        {role.icon}
                      </span>
                      <span className="register-role-title">{role.title}</span>
                      <span className="register-role-desc">{role.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Form fields */}
              <div className="register-grid">
                <label className="register-field register-field--full">
                  <span>Full Name</span>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    placeholder="John Smith"
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    required
                  />
                </label>

                <label className="register-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    required
                  />
                </label>

                <label className="register-field">
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    autoComplete="tel"
                    placeholder="0900000000"
                    value={form.phoneNumber}
                    onChange={(e) => setField('phoneNumber', e.target.value)}
                    required
                  />
                </label>

                <label className="register-field">
                  <span>Password</span>
                  <div className="register-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="register-toggle-pw"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <label className="register-field">
                  <span>Confirm Password</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => setField('confirmPassword', e.target.value)}
                    required
                  />
                </label>
              </div>

              {/* Jockey fields */}
              {isJockey ? (
                <fieldset className="register-fieldset">
                  <legend>Jockey Profile</legend>
                  <div className="register-grid">
                    <label className="register-field">
                      <span>License Number</span>
                      <input
                        type="text"
                        name="licenseNumber"
                        placeholder="e.g. JKY-2024-001"
                        value={form.licenseNumber}
                        onChange={(e) => setField('licenseNumber', e.target.value)}
                        required={isJockey}
                      />
                    </label>

                    <label className="register-field">
                      <span>Weight (kg)</span>
                      <input
                        type="number"
                        name="weight"
                        min="1"
                        step="0.1"
                        placeholder="53"
                        value={form.weight}
                        onChange={(e) => setField('weight', e.target.value)}
                        required={isJockey}
                      />
                    </label>

                    <label className="register-field register-field--full">
                      <span>Bio / Experience (optional)</span>
                      <textarea
                        name="bio"
                        rows={3}
                        placeholder="Briefly describe your racing experience..."
                        value={form.bio}
                        onChange={(e) => setField('bio', e.target.value)}
                      />
                    </label>
                  </div>
                </fieldset>
              ) : null}

              {error ? (
                <div className="register-alert register-alert--error" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="register-actions">
                <button
                  className="register-btn register-btn--primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating account…' : 'Create Account'}
                </button>
                <p className="register-footnote">
                  Spectators receive <strong className="text-secondary">100 initial points</strong> on registration.
                </p>
                <p className="register-footnote">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{ color: 'var(--color-secondary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-on-surface-variant/60 hover:text-primary transition-all duration-200 cursor-pointer bg-transparent border-none text-xs font-semibold uppercase tracking-wider mt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
