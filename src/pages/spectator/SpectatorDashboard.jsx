import { UPCOMING_RACES } from '../../constants'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useAuth } from '../../context/AuthContext'
import { Calendar, MapPin, Ticket, Star, ChevronRight, Eye } from 'lucide-react'
import RaceCard from '../../components/RaceCard'
import { useNavigate } from 'react-router-dom'

export default function SpectatorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const onNavigate = (page) => {
    if (page === 'racedetails') {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow w-full px-6 sm:px-8 py-8">
        <div className="max-w-[1280px] mx-auto">
          {/* Page header */}
          <div className="mb-8 animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Spectator Dashboard</h1>
                <p className="text-on-surface-variant text-sm">Welcome back, {user?.fullName || 'Guest'}!</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
          </div>

          {/* Welcome card */}
          <div className="gs-card p-6 mb-8 animate-fade-in-up delay-row-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Hello</p>
                <p className="text-xl font-bold text-on-surface font-serif">{user?.fullName}</p>
                <p className="text-sm text-on-surface-variant mt-0.5">{user?.email}</p>
                <div className="mt-3">
                  <span className="gs-badge gs-badge-primary">
                    <Star className="w-3 h-3" />
                    Spectator
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-secondary font-mono">100</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Initial Points</p>
              </div>
            </div>
          </div>

          {/* Upcoming races */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-on-surface">Upcoming Races</h2>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider hover:text-primary/80 transition-colors cursor-pointer bg-transparent border-none">
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {UPCOMING_RACES.slice(0, 4).map((race, i) => (
                <div
                  key={race.id}
                  className={`gs-card p-5 animate-fade-in-up delay-row-${i + 1}`}
                  style={{ opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="gs-badge gs-badge-neutral text-[10px]">{race.status}</span>
                    <span className="text-xs text-on-surface-variant font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {race.date}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-on-surface mb-2">{race.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{race.venue}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('racedetails')}
                    className="w-full gs-btn gs-btn-outline-emerald gs-btn-sm flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer onNavigate={() => {}} />
    </div>
  )
}
