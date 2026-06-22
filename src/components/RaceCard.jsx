import React from 'react'
import { Calendar, MapPin, ChevronRight } from 'lucide-react'

const STATUS_CLASS = {
  SCHEDULED:           { badge: 'gs-badge gs-badge-primary',   dot: 'bg-primary',   border: 'border-l-primary border-l-[3px]' },
  'REGISTRATION OPEN':  { badge: 'gs-badge gs-badge-secondary', dot: 'bg-secondary', border: 'border-l-secondary border-l-[3px]' },
  UPCOMING:             { badge: 'gs-badge gs-badge-neutral',   dot: 'bg-tertiary',  border: 'border-l-primary border-l-[3px]' },
}

export default function RaceCard({ race, onNavigate }) {
  const { badge, dot, border } = STATUS_CLASS[race.status] ?? STATUS_CLASS.UPCOMING

  return (
    <div className={`min-w-[280px] sm:min-w-[320px] rounded-2xl p-5 flex flex-col justify-between snap-start transition-all duration-300 group animate-fade-in-up bg-surface-container ${border} border border-outline-variant hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5`}>
      <div>
        {/* Header row */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <span className={badge}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
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
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
