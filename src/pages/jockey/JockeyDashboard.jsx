import DashboardLayout from '../../components/layout/DashboardLayout'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useAuth } from '../../context/AuthContext'
import { User, Medal, Star, Clock, Building2 } from 'lucide-react'

export default function JockeyDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow w-full px-6 sm:px-8 py-8">
        <div className="max-w-[1280px] mx-auto">
          {/* Page header */}
          <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Medal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Dashboard Kỵ sĩ</h1>
                <p className="text-on-surface-variant text-sm">Chào mừng trở lại, {user?.fullName || 'Người dùng'}!</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
          </div>

          {/* Profile card */}
          <div className="gs-card p-6 mb-8 animate-fade-in-up delay-row-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center shrink-0">
                <Medal className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-serif text-xl font-bold text-on-surface">{user?.fullName}</p>
                  <span className="gs-badge gs-badge-primary text-[10px]">
                    <Star className="w-3 h-3" />
                    Kỵ sĩ
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Coming soon */}
          <div className="gs-card-glow p-12 text-center animate-fade-in-up delay-row-2" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="w-16 h-16 rounded-full bg-secondary/10 border-2 border-secondary/25 mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-on-surface mb-3">Sắp Ra Mắt</h3>
            <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">
              Chức năng quản lý lịch đua và hồ sơ kỵ sĩ đang được phát triển bởi đội ngũ GrandStride.
              Hãy quay lại để trải nghiệm phiên bản đầy đủ.
            </p>
          </div>
        </div>
      </main>
      <Footer onNavigate={() => {}} />
    </div>
  )
}
