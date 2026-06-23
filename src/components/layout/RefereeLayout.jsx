import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, Flag, AlertTriangle, User, LogOut, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/referee',             label: 'My Assigned Races', icon: ClipboardList, end: true },
  { to: '/referee/result-entry', label: 'Result Entry',     icon: Flag },
  { to: '/referee/violations',  label: 'Violations',        icon: AlertTriangle },
  { to: '/referee/profile',     label: 'Profile',           icon: User },
]

function getInitials(name) {
  if (!name) return 'R'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function RefereeLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen font-sans" style={{ background: '#0D1117', color: '#E6EDF3' }}>
      {/* Sidebar */}
      <aside className="w-[220px] h-screen fixed left-0 top-0 flex flex-col bg-[#111418] border-r border-white/10 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center text-base flex-shrink-0">
            🏇
          </div>
          <div className="min-w-0">
            <p className="text-yellow-400 font-bold text-sm leading-tight">GrandStride</p>
            <p className="text-gray-500 text-[10px]">Official Referee</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full
                ${isActive
                  ? 'bg-yellow-400/10 text-yellow-400 font-semibold border border-yellow-400/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center text-[10px] font-bold text-yellow-400 flex-shrink-0">
              {getInitials(user?.fullName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Referee'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email ?? ''}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>

          {/* Report Emergency */}
          <button className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
            <Zap size={14} />
            Report Emergency
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto ml-[220px]">
        <Outlet />
      </main>
    </div>
  )
}
