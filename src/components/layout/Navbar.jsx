import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getHomePathForRole } from '../../utils/token'

export default function Navbar({ brandLink = '/' }) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  const handleDashboard = () => {
    const home = getHomePathForRole(user?.role)
    if (home) navigate(home)
  }

  return (
    <header className="w-full bg-background/80 backdrop-blur-md border-b border-outline-variant/10 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
        <Link
          to={brandLink}
          className="font-serif text-2xl text-primary font-bold tracking-tight hover:opacity-90 no-underline"
        >
          GrandStride
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-primary bg-transparent border-none cursor-pointer p-1"
                aria-label="Tài khoản"
              >
                <UserCircle className="w-8 h-8" />
                <span className="hidden sm:inline text-sm">{user?.fullName || user?.email}</span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-52 bg-surface-container border border-outline-variant/30 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/20">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {user?.fullName || 'Người dùng'}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                    <p className="text-xs text-primary mt-1">{user?.role}</p>
                  </div>
                  {getHomePathForRole(user?.role) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        handleDashboard()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high bg-transparent border-none cursor-pointer"
                    >
                      Vào dashboard
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2 bg-transparent border-none cursor-pointer"
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
                className="border border-outline-variant/50 text-on-surface px-4 py-2 rounded-lg text-xs font-semibold uppercase hover:bg-surface-container no-underline"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold uppercase hover:brightness-110 no-underline"
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
