import React from 'react'
import { Calendar, MapPin, Play, ChevronRight } from 'lucide-react'

export default function RaceCard({ race, onNavigate }) {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ĐÃ LÊN LỊCH':
        return 'gs-badge gs-badge-primary'
      case 'MỞ NHẬN ĐĂNG KÝ':
        return 'gs-badge gs-badge-secondary'
      default:
        return 'gs-badge gs-badge-neutral'
    }
  }

  return (
    <div className={`min-w-[280px] sm:min-w-[320px] rounded-2xl p-5 flex flex-col justify-between snap-start transition-all duration-300 group animate-fade-in-up ${
      race.status === 'ĐÃ LÊN LỊCH'
        ? 'bg-surface-container border-l-[3px] border-l-primary border border-outline-variant hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
        : 'bg-surface-container-low border border-outline-variant hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5'
    }`}>
      <div>
        {/* Header row */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <span className={getStatusBadgeClass(race.status)}>
            <span className={`w-1.5 h-1.5 rounded-full ${race.status === 'ĐÃ LÊN LỊCH' ? 'bg-primary' : race.status === 'MỞ NHẬN ĐĂNG KÝ' ? 'bg-secondary' : 'bg-tertiary'}`} />
            {race.status}
          </span>
          <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {race.date}, {race.time}
          </span>
        </div>

        {/* Race name */}
        <h3 className="font-serif text-lg font-bold text-on-surface mb-3 group-hover:text-primary transition-colors leading-snug">
          {race.name}
        </h3>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-outline-variant/20">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium">{race.venue}</span>
        </div>

        <button
          onClick={() => onNavigate('racedetails')}
          className="w-full inline-flex items-center justify-center gap-2 bg-surface-container-high hover:bg-secondary hover:text-on-secondary text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all duration-200 cursor-pointer text-on-surface border border-transparent hover:border-secondary/30 group-hover:shadow-md group-hover:shadow-secondary/10"
        >
          Xem chi tiết
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
