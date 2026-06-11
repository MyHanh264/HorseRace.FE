import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'

export default function HorseOwnerDashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout title="Dashboard Chủ ngựa">
      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6">
        <p className="text-sm text-on-surface-variant mb-1">Tài khoản</p>
        <p className="text-lg font-semibold text-on-surface">{user?.fullName}</p>
        <p className="text-sm text-on-surface-variant">{user?.email}</p>
        <p className="text-sm text-on-surface-variant mt-4 italic">
          Chức năng quản lý chuồng ngựa và đăng ký thi đấu đang được phát triển.
        </p>
      </div>
    </DashboardLayout>
  )
}
