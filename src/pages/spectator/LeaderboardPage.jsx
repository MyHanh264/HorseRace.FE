import { useState, useEffect, useMemo } from 'react'
import { BarChart2, Trophy, Medal, AlertCircle, Crown } from 'lucide-react'
import { getAllUsers } from '../../api/spectator'
import api from '../../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

function getRankBadge(rank) {
  if (rank === 1) return { icon: Crown,  cls: 'text-yellow-400', bg: 'bg-yellow-400/10 border border-yellow-400/25' }
  if (rank === 2) return { icon: Medal,  cls: 'text-gray-300',   bg: 'bg-gray-300/10 border border-gray-300/20' }
  if (rank === 3) return { icon: Medal,  cls: 'text-amber-600',  bg: 'bg-amber-600/10 border border-amber-600/20' }
  return null
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Podium Card (top 3) ──────────────────────────────────────────────────────

function PodiumCard({ rank, entry, isMe }) {
  const badge = getRankBadge(rank)
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
  const orders  = { 1: 'order-2', 2: 'order-1', 3: 'order-3' }
  const BadgeIcon = badge?.icon ?? Trophy

  return (
    <div className={`flex flex-col items-center gap-3 ${orders[rank]}`}>
      {/* Avatar */}
      <div className="relative">
        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-lg font-bold
          ${rank === 1 ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
          : rank === 2 ? 'border-gray-300 bg-gray-300/10 text-gray-300'
          : 'border-amber-600 bg-amber-600/10 text-amber-600'}`}
        >
          {getInitials(entry?.name)}
        </div>
        {badge && (
          <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${badge.bg} flex items-center justify-center`}>
            <BadgeIcon size={12} className={badge.cls} />
          </div>
        )}
        {isMe && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-secondary text-on-secondary text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
            You
          </div>
        )}
      </div>

      {/* Name + stats */}
      <div className="text-center">
        <p className="font-semibold text-on-surface text-sm truncate max-w-[120px]">{entry?.name ?? '—'}</p>
        <p className="text-xs text-on-surface-variant">{entry?.totalBets ?? 0} bets</p>
      </div>

      {/* Podium bar */}
      <div className={`w-24 ${heights[rank]} rounded-t-lg flex items-end justify-center pb-3
        ${rank === 1 ? 'bg-gradient-to-t from-yellow-400/30 to-yellow-400/10 border border-yellow-400/25'
        : rank === 2 ? 'bg-gradient-to-t from-gray-400/20 to-gray-400/5 border border-gray-300/20'
        : 'bg-gradient-to-t from-amber-600/20 to-amber-600/5 border border-amber-600/20'}`}
      >
        <div className="text-center">
          <p className={`font-bold font-mono text-lg
            ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'}`}
          >
            #{rank}
          </p>
          <p className={`text-xs font-bold
            ${rank === 1 ? 'text-yellow-400/70' : 'text-on-surface-variant'}`}
          >
            {fmtBalance(entry?.totalWinnings ?? 0)} pts
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [allPredictions, setAllPredictions] = useState([])
  const [users,          setUsers]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [activeTab,      setActiveTab]      = useState('All Time')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [predsData, usersData] = await Promise.all([
          api.get('/api/predictions').then(r => r.data),
          getAllUsers(),
        ])
        if (!active) return
        setAllPredictions(Array.isArray(predsData) ? predsData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      } catch (err) {
        if (active) setError(err?.message || 'Không tải được leaderboard')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [])

  const userMap = useMemo(
    () => Object.fromEntries(users.map(u => [u.userId, u])),
    [users],
  )

  // Aggregate predictions per spectator
  const leaderboard = useMemo(() => {
    const map = {}
    for (const p of allPredictions) {
      if (!map[p.spectatorId]) {
        map[p.spectatorId] = { spectatorId: p.spectatorId, totalBets: 0, wonBets: 0, totalStaked: 0, totalWinnings: 0 }
      }
      const e = map[p.spectatorId]
      e.totalBets++
      if (p.status !== 'Cancelled') e.totalStaked += Number(p.betAmount)
      if (p.status === 'Won') {
        e.wonBets++
        // Estimate winnings: betAmount × oddsLocked1 (simplified)
        e.totalWinnings += Number(p.betAmount) * (Number(p.oddsLocked1) || 1)
      }
    }

    return Object.values(map)
      .map(e => ({
        ...e,
        name:    userMap[e.spectatorId]?.fullName ?? `User #${e.spectatorId}`,
        winRate: e.totalBets > 0 ? Math.round((e.wonBets / e.totalBets) * 100) : 0,
      }))
      .sort((a, b) => b.totalWinnings - a.totalWinnings)
  }, [allPredictions, userMap])

  const top3 = leaderboard.slice(0, 3)

  const TABS = ['All Time', 'This Month', 'This Week']

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <BarChart2 size={20} className="text-secondary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Leaderboard</h1>
                <p className="text-on-surface-variant text-sm">Top spectators ranked by total winnings.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-surface-container-highest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="gs-card p-16 text-center">
            <Trophy size={40} className="text-on-surface-variant/30 mx-auto mb-4" />
            <p className="text-on-surface font-semibold">No data yet</p>
            <p className="text-on-surface-variant text-sm mt-1">Rankings will appear once bets are settled.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 2 && (
              <div className="gs-card p-8 mb-8">
                <p className="text-center text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-8">
                  Top Performers
                </p>
                <div className="flex items-end justify-center gap-6">
                  {[
                    top3[1] && { rank: 2, entry: top3[1] },
                    top3[0] && { rank: 1, entry: top3[0] },
                    top3[2] && { rank: 3, entry: top3[2] },
                  ].filter(Boolean).map(({ rank, entry }) => (
                    <PodiumCard key={rank} rank={rank} entry={entry} isMe={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Full Rankings Table */}
            <div className="gs-card overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/40">
                <h2 className="font-semibold text-on-surface text-sm">
                  Full Rankings
                  <span className="ml-2 text-on-surface-variant font-normal">({leaderboard.length} spectators)</span>
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Spectator</th>
                      <th>Total Bets</th>
                      <th>Won</th>
                      <th>Win Rate</th>
                      <th>Total Staked</th>
                      <th>Total Winnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const rank  = i + 1
                      const badge = getRankBadge(rank)
                      const BadgeIcon = badge?.icon

                      return (
                        <tr
                          key={entry.spectatorId}
                          className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                          style={{ opacity: 0, animationFillMode: 'forwards' }}
                        >
                          {/* Rank */}
                          <td>
                            {badge ? (
                              <div className={`w-8 h-8 rounded-lg ${badge.bg} flex items-center justify-center`}>
                                <BadgeIcon size={14} className={badge.cls} />
                              </div>
                            ) : (
                              <span className="font-mono text-sm text-on-surface-variant font-bold">#{rank}</span>
                            )}
                          </td>

                          {/* Name */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                                {getInitials(entry.name)}
                              </div>
                              <span className="font-semibold text-on-surface text-sm">{entry.name}</span>
                            </div>
                          </td>

                          <td className="font-mono text-sm text-on-surface-variant">{entry.totalBets}</td>
                          <td className="font-mono text-sm text-primary">{entry.wonBets}</td>

                          {/* Win Rate */}
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${entry.winRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-on-surface-variant">{entry.winRate}%</span>
                            </div>
                          </td>

                          <td className="font-mono text-sm text-on-surface-variant">
                            {fmtBalance(entry.totalStaked)} pts
                          </td>

                          {/* Winnings */}
                          <td>
                            <span className={`font-bold font-mono text-sm ${entry.totalWinnings > 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                              {fmtBalance(entry.totalWinnings)} pts
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
