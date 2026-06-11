import { UPCOMING_RACES } from '../../constants'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'

export default function SpectatorDashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout title="Dashboard Khán giả">
      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 mb-6">
        <p className="text-sm text-on-surface-variant mb-1">Xin chào</p>
        <p className="text-lg font-semibold text-on-surface">{user?.fullName}</p>
        <p className="text-sm text-on-surface-variant">{user?.email}</p>
      </div>

      <h2 className="text-lg font-semibold text-primary mb-4">Các vòng đua sắp diễn ra</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {UPCOMING_RACES.slice(0, 4).map((race) => (
          <div
            key={race.id}
            className="border border-outline-variant/30 rounded-lg p-4 bg-surface-container-low"
          >
            <p className="font-semibold text-on-surface">{race.name}</p>
            <p className="text-xs text-on-surface-variant mt-1">{race.date}</p>
            <p className="text-xs text-on-surface-variant">{race.location}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
