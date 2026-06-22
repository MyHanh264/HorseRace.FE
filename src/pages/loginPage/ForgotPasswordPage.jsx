import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'
import { Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(() => location.state?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const goToReset = () => {
    navigate('/reset-password', { state: { email: email.trim() } })
  }

  const resendOtp = async () => {
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100svh-80px)] flex items-center justify-center p-6 background-glow relative">
      {/* Atmospheric glow */}
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
            Forgot Password
          </p>
          <p className="text-xs text-on-surface-variant mt-2 font-medium uppercase tracking-widest">
            Recover Account Access
          </p>
        </div>

        {/* Card */}
        <div className="login-card w-full rounded-2xl p-8 flex flex-col gap-5">
          {error && sent ? (
            <div className="auth-alert auth-alert--error">{error}</div>
          ) : null}

          {sent ? (
            <div className="flex flex-col gap-4">
              <div className="auth-alert auth-alert--success flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">OTP code sent successfully!</p>
                  <p className="mt-1 text-xs opacity-80">Check your email and Spam folder.</p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                An OTP code has been sent to <span className="text-secondary font-bold">{email.trim()}</span>.
                The code is valid for 10 minutes.
              </p>
              <button
                type="button"
                className="auth-btn auth-btn--primary flex items-center justify-center gap-2"
                onClick={goToReset}
              >
                Enter OTP & Set New Password
              </button>
              <button
                type="button"
                disabled={submitting}
                className="auth-btn auth-btn--ghost flex items-center justify-center gap-2"
                onClick={resendOtp}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                    Resending...
                  </>
                ) : (
                  <>Resend OTP Code</>
                )}
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="auth-alert auth-alert--error">{error}</div>
              ) : null}

              <div className="auth-form-field">
                <span htmlFor="email">Registered Email</span>
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

              <button
                type="submit"
                disabled={submitting}
                className="auth-btn auth-btn--primary mt-1 py-3.5 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>Send OTP Code via Email</>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Create a new account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-secondary font-bold hover:underline cursor-pointer bg-transparent border-none transition-colors"
              >
                Register now
              </button>
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
