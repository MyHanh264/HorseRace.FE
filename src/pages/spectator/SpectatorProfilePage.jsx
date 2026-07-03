import { useState, useEffect, useMemo } from 'react'
import {
  User, Mail, Lock, Shield, Save, Eye, EyeOff,
  Trophy, Flag, TrendingUp, Wallet, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyWallet, getMyPredictions } from '../../api/spectator'
import api from '../../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, readOnly }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">{children}</span>
      {readOnly && (
        <span className="text-[10px] px-2 py-0.5 rounded text-on-surface-variant border border-outline-variant/50 font-medium uppercase tracking-wider">
          Read-only
        </span>
      )}
    </div>
  )
}

function InputField({ icon: Icon, value, onChange, placeholder, readOnly, type = 'text' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all
      ${readOnly
        ? 'bg-surface-container-low/50 border-outline-variant/30 cursor-not-allowed'
        : 'bg-surface-container-lowest border-outline-variant/50 hover:border-outline focus-within:border-secondary'
      }`}
    >
      {Icon && <Icon size={15} className="text-on-surface-variant shrink-0" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`flex-1 bg-transparent outline-none text-sm
          ${readOnly ? 'text-on-surface-variant cursor-not-allowed' : 'text-on-surface placeholder:text-on-surface-variant/50'}`}
      />
      {readOnly && <Lock size={13} className="text-on-surface-variant/40 shrink-0" />}
    </div>
  )
}

function PasswordField({ placeholder, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest hover:border-outline focus-within:border-secondary text-sm transition-all">
      <Lock size={15} className="text-on-surface-variant shrink-0" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete ?? 'new-password'}
        className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/50"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="text-on-surface-variant hover:text-on-surface transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function StatCard({ Icon, color, bg, value, label }) {
  return (
    <div className="gs-card p-4 flex flex-col items-center gap-1 text-center">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-1`}>
        <Icon size={16} className={color} />
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-on-surface-variant">{label}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpectatorProfilePage() {
  const { user } = useAuth()
  const userId = user?.userId

  const [fullName,    setFullName]    = useState(user?.fullName ?? '')
  const [wallet,      setWallet]      = useState(null)
  const [predictions, setPredictions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [saveError,   setSaveError]   = useState('')
  const [currentPw,   setCurrentPw]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [updatingPw,  setUpdatingPw]  = useState(false)
  const [pwMsg,       setPwMsg]       = useState('')

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let active = true

    async function load() {
      setLoading(true)
      try {
        const [w, p] = await Promise.all([
          getMyWallet(userId),
          getMyPredictions(userId),
        ])
        if (!active) return
        setWallet(w)
        setPredictions(Array.isArray(p) ? p : [])
      } catch (err) {
        console.error('Profile load failed:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [userId])

  // ── Derived stats ──
  const totalBets  = predictions.filter(p => p.status !== 'Cancelled').length
  const wonBets    = predictions.filter(p => p.status === 'Won').length
  const winRate    = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0
  const totalStaked = useMemo(
    () => predictions.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + Number(p.betAmount), 0),
    [predictions],
  )

  // ── Save profile ──
  const handleSave = async () => {
    if (!userId || !fullName.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      await api.put(`/api/users/${userId}`, { userId, fullName: fullName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  // ── Change password ──
  const handleUpdatePassword = async () => {
    if (!currentPw || !newPw) { setPwMsg('Vui lòng điền đủ thông tin.'); return }
    setUpdatingPw(true)
    setPwMsg('')
    try {
      await api.put(`/api/users/${userId}/change-password`, { currentPassword: currentPw, newPassword: newPw })
      setPwMsg('Đổi mật khẩu thành công!')
      setCurrentPw('')
      setNewPw('')
    } catch (err) {
      setPwMsg(err?.response?.data?.message || 'Đổi mật khẩu thất bại.')
    } finally {
      setUpdatingPw(false)
    }
  }

  const STATS = [
    { Icon: Flag,       color: 'text-primary',   bg: 'bg-primary/10 border border-primary/20',     value: totalBets,           label: 'Total Bets' },
    { Icon: Trophy,     color: 'text-secondary',  bg: 'bg-secondary/10 border border-secondary/20', value: wonBets,             label: 'Won' },
    { Icon: TrendingUp, color: 'text-primary',    bg: 'bg-primary/10 border border-primary/20',     value: `${winRate}%`,       label: 'Win Rate' },
    { Icon: Wallet,     color: 'text-secondary',  bg: 'bg-secondary/10 border border-secondary/20', value: fmtBalance(wallet?.balance ?? 0), label: 'Balance (pts)' },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[960px] mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <User size={20} className="text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">My Profile</h1>
              <p className="text-on-surface-variant text-sm">Manage your account information and security.</p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">

            {/* Personal info card */}
            <div
              className="gs-card p-6 animate-fade-in-up delay-row-1"
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              {/* Avatar row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full border-2 border-secondary/40 bg-secondary/10 flex items-center justify-center text-secondary font-bold text-2xl shrink-0">
                  {loading ? '…' : getInitials(fullName || user?.fullName)}
                </div>
                <div>
                  <p className="text-on-surface font-bold text-lg leading-tight">{user?.fullName ?? '—'}</p>
                  <p className="text-on-surface-variant text-sm mt-0.5">{user?.email ?? '—'}</p>
                  <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    Spectator
                  </span>
                </div>
              </div>

              <h2 className="text-sm font-bold text-on-surface mb-4">Personal Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldLabel>Display Name</FieldLabel>
                  <InputField
                    icon={User}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel readOnly>Email Address</FieldLabel>
                  <InputField icon={Mail} value={user?.email ?? ''} readOnly />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel readOnly>Role</FieldLabel>
                  <InputField icon={User} value="Spectator" readOnly />
                </div>
              </div>

              {saveError && (
                <div className="mt-4 flex items-center gap-2 text-error text-sm p-3 rounded-xl bg-error/10 border border-error/25">
                  <AlertCircle size={15} className="shrink-0" />{saveError}
                </div>
              )}

              <div className="flex justify-end mt-5">
                <button
                  onClick={handleSave}
                  disabled={saving || !fullName.trim()}
                  className={`gs-btn flex items-center gap-2 transition-all
                    ${saved ? 'gs-btn-primary' : 'gs-btn-secondary'} disabled:opacity-50`}
                >
                  {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Security card */}
            <div
              className="gs-card p-6 animate-fade-in-up delay-row-2"
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              <h2 className="text-sm font-bold text-on-surface mb-5 flex items-center gap-2">
                <Shield size={16} className="text-secondary" />
                Security
              </h2>

              <div className="max-w-sm flex flex-col gap-4">
                <div>
                  <FieldLabel>Current Password</FieldLabel>
                  <PasswordField
                    placeholder="••••••••"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <FieldLabel>New Password</FieldLabel>
                  <PasswordField
                    placeholder="Min 8 characters"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                {pwMsg && (
                  <p className={`text-sm ${pwMsg.includes('thành công') ? 'text-primary' : 'text-error'}`}>
                    {pwMsg}
                  </p>
                )}

                <button
                  onClick={handleUpdatePassword}
                  disabled={updatingPw || !currentPw || !newPw}
                  className="gs-btn gs-btn-ghost w-fit disabled:opacity-50"
                >
                  {updatingPw ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div
            className="flex flex-col gap-4 animate-fade-in-up delay-row-2"
            style={{ opacity: 0, animationFillMode: 'forwards' }}
          >
            {/* Stats */}
            <div className="gs-card p-5">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                Betting Stats
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {STATS.map(s => (
                    <StatCard key={s.label} {...s} />
                  ))}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your <span className="text-on-surface font-semibold">Display Name</span> is visible on the leaderboard.
                Keep it updated to stand out among other spectators.
              </p>
            </div>

            {/* Account ID */}
            <div className="gs-card p-4">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Account ID</p>
              <p className="font-mono text-sm text-on-surface">
                SPEC-{String(userId ?? '—').padStart(4, '0')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
