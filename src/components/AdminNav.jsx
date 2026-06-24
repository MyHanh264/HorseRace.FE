import { NavLink } from 'react-router-dom'
import { Users, PawPrint } from 'lucide-react'

const tabs = [
  { to: '/admin', label: 'Tài khoản', icon: Users, end: true },
  { to: '/admin/horses', label: 'Duyệt ngựa', icon: PawPrint },
]

export default function AdminNav() {
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all no-underline ${
              isActive
                ? 'bg-secondary/15 text-secondary border border-secondary/30'
                : 'text-on-surface-variant border border-outline-variant/40 hover:text-on-surface hover:bg-surface-container'
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </div>
  )
}
