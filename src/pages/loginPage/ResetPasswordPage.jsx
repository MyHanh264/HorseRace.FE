import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resetPassword } from '../../api/auth'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

function validateForm({ email, otpCode, newPassword, confirmPassword }) {
  if (!email?.includes('@')) return 'Please enter a valid email address.'
  if (!otpCode || otpCode.length !== 6) return 'OTP code must be exactly 6 digits.'
  if (!/^\d{6}$/.test(otpCode)) return 'OTP code must contain only numbers.'
  if (!newPassword || newPassword.length < 8) return 'New password must be at least 8 characters.'
  if (newPassword !== confirmPassword) return 'Passwords do not match.'
  return null
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(() => location.state?.email || '')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const onOtpChange = (value) => {
    setError('')
    setOtpCode(value.replace(/\D/g, '').slice(0, 6))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const clientError = validateForm({ email, otpCode, newPassword, confirmPassword })
    if (clientError) {
      setError(clientError)
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ email: email.trim(), otpCode, newPassword, confirmPassword })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100svh-80px)] flex items-center justify-center p-6 background-glow relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-secondary/15 blur-[120px]" />
      </div>

      <main className="w-full max-w-[440px] flex flex-col items-center relative z-10">
        {/* Brand */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="font-serif text-4xl text-primary font-bold tracking-tight mb-2 hover:opacity-90 active:scale-[0.98] transition-all bg-transparent border-none cursor-pointer"
          >
            GrandStride
          </button>
          <p className="font-serif text-2xl text-on-surface font-semibold tracking-wide mt-1">
            Reset Password
          </p>
          <p className="text-xs text-on-surface-variant mt-2 font-medium uppercase tracking-widest">
            OTP Verification &amp; Recovery
          </p>
        </div>

        {/* Card */}
        <div className="login-card w-full rounded-2xl p-8 flex flex-col gap-5">
          {done ? (
            <div className="flex flex-col gap-4 text-center items-center">
              <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-bold text-on-surface">Password changed successfully!</h3>
              <p className="text-sm text-on-surface-variant">You can now sign in with your new password.</p>
              <button
                type="button"
                className="auth-btn auth-btn--primary w-full flex items-center justify-center gap-2"
                onClick={() => navigate('/login', { state: { email: email.trim() } })}
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="auth-alert auth-alert--error">{error}</div>
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
                    value={email}
                    onChange={(e) => { setError(''); setEmail(e.target.value) }}
                    placeholder="champion@grandstride.com"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* OTP */}
              <div className="auth-form-field">
                <span htmlFor="otpCode">Verification Code (6 digits)</span>
                <div className="relative input-focus-gold border border-outline-variant/30 rounded-xl bg-surface-container-lowest flex items-center px-4">
                  <Lock className="w-5 h-5 text-on-surface-variant/60 mr-3 shrink-0" />
                  <input
                    id="otpCode"
                    type="text"
                    name="otpCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => onOtpChange(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30 font-mono tracking-[0.35em] text-center text-lg"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="auth-form-field">
                <span htmlFor="newPassword">New Password (min. 8 characters)</span>
                <div className="relative input-focus-gold border border-outline-variant/30 rounded-xl bg-surface-container-lowest flex items-center px-4">
                  <Lock className="w-5 h-5 text-on-surface-variant/60 mr-3 shrink-0" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => { setError(''); setNewPassword(e.target.value) }}
                    placeholder="Enter new password"
                    required
                    minLength={8}
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

              {/* Confirm Password */}
              <div className="auth-form-field">
                <span htmlFor="confirmPassword">Confirm New Password</span>
                <div className="relative input-focus-gold border border-outline-variant/30 rounded-xl bg-surface-container-lowest flex items-center px-4">
                  <Lock className="w-5 h-5 text-on-surface-variant/60 mr-3 shrink-0" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => { setError(''); setConfirmPassword(e.target.value) }}
                    placeholder="Re-enter new password"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="auth-btn auth-btn--primary mt-1 py-3.5 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>Reset Password</>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Didn't receive the code?{' '}
              <Link
                to="/forgot-password"
                state={{ email: email.trim() }}
                className="text-secondary font-bold hover:underline transition-colors"
              >
                Resend OTP
              </Link>
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mt-6 mx-auto flex items-center gap-2 text-on-surface-variant/60 hover:text-primary transition-colors duration-200 cursor-pointer bg-transparent border-none text-xs font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>
      </main>
    </div>
  )
}
