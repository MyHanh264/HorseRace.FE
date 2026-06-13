import React from 'react'
import { Search, Bell, Settings, LogOut, Menu, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ title, onSearch, searchValue, showBack = false, onBack }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-20 bg-[rgba(11,20,28,0.92)] backdrop-blur-xl border-b border-[rgba(64,73,65,0.5)] px-6 sm:px-8 sticky top-0 z-40 flex items-center justify-between">
      {/* Left: Brand + Title */}
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-[rgba(141,214,166,0.1)] border border-[rgba(141,214,166,0.2)]">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>

          <div className="flex flex-col">
            <h1 className="font-serif text-base sm:text-lg font-bold text-primary tracking-wide leading-none">
              GrandStride
            </h1>
            <span className="hidden sm:block text-[10px] text-on-surface-variant font-medium uppercase tracking-widest mt-0.5">
              Admin Console
            </span>
          </div>

          <div className="hidden md:block h-8 w-[1px] bg-outline-variant/40 mx-2" />

          <span className="hidden md:inline font-sans text-sm text-on-surface-variant font-medium">
            {title || 'Bảng quản trị hệ thống'}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative group hidden lg:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-secondary transition-colors" />
          <input
            type="text"
            placeholder="Tìm kiếm hồ sơ..."
            value={searchValue || ''}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-64 bg-surface-container-high border border-outline-variant/60 text-xs text-on-surface placeholder:text-on-surface-variant/50 rounded-full pl-9 pr-4 py-2.5 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all font-sans"
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button className="relative p-2.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest rounded-lg transition-all cursor-pointer group" aria-label="Thông báo">
            <Bell className="w-[18px] h-[18px] group-hover:scale-105 transition-transform" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-pulse" />
          </button>
          <button className="p-2.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container-highest rounded-lg transition-all cursor-pointer group" aria-label="Cài đặt">
            <Settings className="w-[18px] h-[18px] group-hover:rotate-45 transition-transform duration-200" />
          </button>
        </div>

        {/* Admin profile */}
        <div className="hidden md:flex items-center gap-3 pl-3 border-l border-outline-variant/40">
          <div className="flex flex-col items-end">
            <span className="font-sans font-bold text-xs text-secondary leading-tight">Ban Điều Hành</span>
            <span className="text-[10px] text-on-surface-variant/60 font-medium">{user?.email || 'admin@grandstride.com'}</span>
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-outline-variant bg-surface-container-high flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="hidden lg:flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error px-3 py-2 rounded-lg hover:bg-error/10 transition-all cursor-pointer bg-transparent border border-transparent hover:border-error/20"
          aria-label="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-surface-container border-b border-outline-variant shadow-xl md:hidden z-50 animate-fade-in-up">
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-secondary">Ban Điều Hành</p>
                <p className="text-xs text-on-surface-variant">{user?.email || 'admin@grandstride.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
