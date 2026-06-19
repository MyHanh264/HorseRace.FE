import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle, ChevronDown, LayoutDashboard, Home, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getHomePathForRole } from '../../utils/token'

export default function Navbar({ brandLink = '/' }) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setUserMenuOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  const handleDashboard = () => {
    setUserMenuOpen(false)
    const home = getHomePathForRole(user?.role)
    if (home) navigate(home)
  }

  const getProfilePath = (role) => {
    if (role === 'JOCKEY') return '/jockey/profile'
    if (role === 'HORSE_OWNER') return '/horse-owner/profile'
    return null
  }

  const handleProfile = () => {
    setUserMenuOpen(false)
    const path = getProfilePath(user?.role)
    if (path) navigate(path)
  }

  return (
    <header className="w-full bg-[rgba(11,20,28,0.85)] backdrop-blur-xl border-b border-[rgba(64,73,65,0.6)] sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link
          to={brandLink}
          className="font-serif text-2xl text-white font-bold tracking-tight hover:opacity-80 no-underline transition-all"
        >
          GrandStride
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-on-surface hover:text-primary bg-transparent border border-transparent hover:border-outline-variant rounded-lg px-3 py-2 cursor-pointer transition-all"
                aria-label="Tài khoản"
              >
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant">
                  <UserCircle className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-semibold text-on-surface leading-tight">{user?.fullName || 'Người dùng'}</span>
                  <span className="text-[10px] text-primary font-medium uppercase tracking-wider">{user?.role}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-container border border-outline-variant shadow-xl shadow-black/30 overflow-hidden z-50 animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-outline-variant/50">
                    <p className="text-sm font-semibold text-on-surface truncate">{user?.fullName || 'Người dùng'}</p>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">{user?.email}</p>
                    <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                      {user?.role}
                    </span>
                  </div>
                  {getHomePathForRole(user?.role) ? (
                    <button
                      type="button"
                      onClick={handleDashboard}
                      className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high flex items-center gap-3 transition-colors cursor-pointer bg-transparent border-none"
                    >
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      Vào dashboard
                    </button>
                  ) : null}
                  {getProfilePath(user?.role) ? (
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high flex items-center gap-3 transition-colors cursor-pointer bg-transparent border-none"
                    >
                      <User className="w-4 h-4 text-primary" />
                      Hồ sơ cá nhân
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate('/'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high flex items-center gap-3 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <Home className="w-4 h-4 text-on-surface-variant" />
                    Trang chủ
                  </button>
                  <div className="border-t border-outline-variant/50" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/10 flex items-center gap-3 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all no-underline hover:bg-surface-container"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:brightness-110 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all no-underline shadow-lg shadow-primary/20"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
