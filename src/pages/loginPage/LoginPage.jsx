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
      setError('Email không hợp lệ.')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.')
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
          <p className="auth-visual-eyebrow">Nền tảng quản lý đua ngựa</p>
          <h1 className="auth-visual-title">Nơi những nhà vô địch ra đời</h1>
          <p className="auth-visual-desc">
            Đồng hành cùng GrandStride — quản lý chuồng ngựa, theo dõi vòng đua và khẳng định huyền thoại của bạn.
          </p>
          <div className="flex flex-wrap gap-6 mt-2">
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">1,200+</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Vận động viên</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">48</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Vòng đua</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-secondary leading-none">5</span>
              <span className="block text-[11px] text-white/70 uppercase tracking-wider mt-0.5">Vai trò</span>
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
            <p className="text-sm text-on-surface-variant mt-1 font-medium">Đăng nhập vào tài khoản của bạn</p>
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
                <span htmlFor="email">Địa chỉ Email</span>
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
                  <span htmlFor="password">Mật khẩu</span>
                  <Link
                    to="/forgot-password"
                    state={{ email: email.trim() }}
                    className="text-xs text-secondary hover:underline font-semibold transition-colors"
                  >
                    Quên mật khẩu?
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
                    placeholder="Nhập mật khẩu"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3.5 text-sm placeholder:text-on-surface-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none text-on-surface-variant/60 hover:text-secondary p-1 bg-transparent border-none cursor-pointer transition-colors shrink-0 ml-2"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                  Ghi nhớ đăng nhập
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
                    Đang Xác Thực...
                  </>
                ) : (
                  <>Đăng Nhập</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-[1px] bg-outline-variant/30 flex-grow" />
              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">hoặc</span>
              <div className="h-[1px] bg-outline-variant/30 flex-grow" />
            </div>

            {/* Google */}
            <button
              onClick={() => alert('Tính năng đăng nhập Google sẽ sớm được ra mắt!')}
              className="w-full flex items-center justify-center gap-3 py-3 border border-outline-variant/40 text-xs tracking-wider font-semibold rounded-xl hover:bg-surface-container transition-all active:scale-[0.98] cursor-pointer text-on-surface-variant bg-transparent"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Tiếp tục với Google
            </button>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-outline-variant/10">
              <p className="text-xs text-on-surface-variant">
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-secondary font-bold hover:underline cursor-pointer bg-transparent border-none transition-colors"
                >
                  Đăng ký ngay
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
            Quay về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
