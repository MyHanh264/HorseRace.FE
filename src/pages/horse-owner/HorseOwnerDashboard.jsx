import { useAuth } from '../../context/AuthContext'
import { PawPrint, ClipboardList, Clock } from 'lucide-react'

export default function HorseOwnerDashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Xin chào, {user?.fullName || 'Chủ ngựa'}!
        </h1>
        <p className="text-gray-400 mt-1">Chào mừng bạn trở lại GrandStride.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a2035] rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <PawPrint className="text-emerald-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">—</div>
            <div className="text-sm text-gray-400">Tổng số ngựa</div>
          </div>
        </div>

        <div className="bg-[#1a2035] rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <ClipboardList className="text-yellow-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">—</div>
            <div className="text-sm text-gray-400">Lượt đăng ký đua</div>
          </div>
        </div>

        <div className="bg-[#1a2035] rounded-xl p-5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Clock className="text-blue-400" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">—</div>
            <div className="text-sm text-gray-400">Chờ phê duyệt</div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a2035] rounded-xl p-8 border border-white/10 text-center">
        <Clock className="mx-auto text-gray-600 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-white mb-1">Tính năng sắp ra mắt</h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Chức năng thống kê và quản lý nâng cao đang được phát triển.
        </p>
      </div>
    </div>
  )
}
