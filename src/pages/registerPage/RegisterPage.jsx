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
    title: 'Khán giả',
    description: 'Xem giải, dự đoán kết quả và nhận thưởng.',
    icon: '◎',
  },
  {
    code: 'HORSE_OWNER',
    title: 'Chủ ngựa',
    description: 'Đăng ký ngựa, thuê jockey và quản lý lịch.',
    icon: '♞',
  },
  {
    code: 'JOCKEY',
    title: 'Tay đua ngựa',
    description: 'Nhận lời mời, xác nhận và theo dõi thành tích.',
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
  if (!form.email?.includes('@')) return 'Email không hợp lệ.'
  if (!form.password || form.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.'
  if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.'
  if (!form.fullName?.trim()) return 'Họ tên là bắt buộc.'
  if (!form.phoneNumber?.trim()) return 'Số điện thoại là bắt buộc.'
  if (!PUBLIC_ROLES.some((r) => r.code === form.roleCode)) return 'Vai trò không hợp lệ.'
  if (form.roleCode === 'JOCKEY') {
    if (!form.licenseNumber?.trim()) return 'Số chứng chỉ hành nghề là bắt buộc với Kỵ sĩ.'
    const w = parseFloat(form.weight)
    if (Number.isNaN(w) || w <= 0) return 'Cân nặng phải là số dương hợp lệ.'
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
          <p className="register-eyebrow">Trở Thành Thành Viên</p>
          <h1>Gia Nhập Thế Giới Đua Ngựa</h1>
          <p>
            Tạo tài khoản ngay hôm nay và bắt đầu hành trình cùng GrandStride.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="register-container">
        <div className="register-card">
          <div className="register-card-header">
            <h2>Tạo Tài Khoản Mới</h2>
          </div>

          {success ? (
            <div className="register-success-card">
              {success.requiresApproval ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                    <span className="register-success-badge">Đang chờ duyệt</span>
                  </div>
                  <h3>Đăng ký thành công</h3>
                  <p>
                    Tài khoản của <strong>{success.fullName}</strong> đang chờ quản trị viên phê duyệt.
                  </p>
                  <div className="register-success-actions">
                    <Link
                      className="register-btn register-btn--primary"
                      to="/login"
                      state={{ email: success.email }}
                    >
                      Về trang đăng nhập
                    </Link>
                    <button
                      type="button"
                      className="register-btn register-btn--ghost"
                      onClick={() => setSuccess(null)}
                    >
                      Đăng ký tài khoản khác
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <span className="register-success-badge" style={{ background: 'rgba(141,214,166,0.15)', color: 'var(--color-primary)', borderColor: 'rgba(141,214,166,0.3)' }}>Thành công</span>
                  </div>
                  <h3>Đăng ký hoàn tất</h3>
                  <p>
                    Chào <strong>{success.fullName}</strong>. Email: <strong>{success.email}</strong>. Hãy đăng nhập để tiếp tục.
                  </p>
                  <div className="register-success-actions">
                    <Link
                      className="register-btn register-btn--primary"
                      to="/login"
                      state={{ email: success.email }}
                    >
                      Đăng nhập ngay
                    </Link>
                    <button
                      type="button"
                      className="register-btn register-btn--ghost"
                      onClick={() => setSuccess(null)}
                    >
                      Đăng ký tài khoản khác
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form className="register-form" onSubmit={onSubmit} noValidate>
              {/* Role selector */}
              <fieldset className="register-fieldset">
                <legend>Chọn vai trò</legend>
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
                  <span>Họ và tên</span>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
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
                  <span>Số điện thoại</span>
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
                  <span>Mật khẩu</span>
                  <div className="register-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Tối thiểu 8 ký tự"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="register-toggle-pw"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </label>

                <label className="register-field">
                  <span>Xác nhận mật khẩu</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={(e) => setField('confirmPassword', e.target.value)}
                    required
                  />
                </label>
              </div>

              {/* Jockey fields */}
              {isJockey ? (
                <fieldset className="register-fieldset">
                  <legend>Hồ sơ Kỵ sĩ</legend>
                  <div className="register-grid">
                    <label className="register-field">
                      <span>Số chứng chỉ hành nghề</span>
                      <input
                        type="text"
                        name="licenseNumber"
                        placeholder="VD: JKY-2024-001"
                        value={form.licenseNumber}
                        onChange={(e) => setField('licenseNumber', e.target.value)}
                        required={isJockey}
                      />
                    </label>

                    <label className="register-field">
                      <span>Cân nặng (kg)</span>
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
                      <span>Tiểu sử / kinh nghiệm (tùy chọn)</span>
                      <textarea
                        name="bio"
                        rows={3}
                        placeholder="Mô tả ngắn về kinh nghiệm thi đấu..."
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
                  {submitting ? 'Đang đăng ký…' : 'Đăng ký tài khoản'}
                </button>
                <p className="register-footnote">
                  Khán giả nhận <strong className="text-secondary">100 điểm</strong> khởi tạo.
                </p>
                <p className="register-footnote">
                  Đã có tài khoản?{' '}
                  <Link
                    to="/login"
                    style={{ color: 'var(--color-secondary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Đăng nhập
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
            Quay về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
