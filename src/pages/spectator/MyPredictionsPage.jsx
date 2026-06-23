import { useState, useEffect, useCallback, useMemo } from 'react'
import { BookOpen, AlertCircle, X, XCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyPredictions, cancelPrediction, getAllRaces, getAllTournaments, getMyWallet } from '../../api/spectator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRED_STATUS_META = {
  Pending:   { label: 'Scheduled',  cls: 'bg-primary/15 text-primary border border-primary/25',          dot: 'bg-primary' },
  Won:       { label: 'Won',        cls: 'bg-secondary/15 text-secondary border border-secondary/25',     dot: 'bg-secondary' },
  Lost:      { label: 'Lost',       cls: 'bg-error/15 text-error border border-error/25',                 dot: 'bg-error' },
  Cancelled: { label: 'Cancelled',  cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50', dot: 'bg-on-surface-variant' },
}

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

function StatCard({ icon: Icon, iconCls, label, value }) {
  return (
    <div className="gs-card p-5">
      <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-on-surface font-mono">{value}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyPredictionsPage() {
  const { user } = useAuth()

  const [predictions,  setPredictions]  = useState([])
  const [races,        setRaces]        = useState([])
  const [tournaments,  setTournaments]  = useState([])
  const [wallet,       setWallet]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [activeTab,    setActiveTab]    = useState('Active')
  const [cancelling,   setCancelling]   = useState(null)
  const [cancelError,  setCancelError]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [preds, r, t, w] = await Promise.all([
        getMyPredictions(user?.userId),
        getAllRaces(),
        getAllTournaments(),
        getMyWallet(user?.userId),
      ])
      setPredictions(Array.isArray(preds) ? preds : [])
      setRaces(Array.isArray(r) ? r : [])
      setTournaments(Array.isArray(t) ? t : [])
      setWallet(w)
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => { load() }, [load])

  const raceMap       = useMemo(() => Object.fromEntries(races.map(r => [r.raceId, r])), [races])
  const tournamentMap = useMemo(() => Object.fromEntries(tournaments.map(t => [t.tournamentId, t])), [tournaments])

  // Active = Pending | Won (still showing), History = Lost | Cancelled
  const displayed = useMemo(() =>
    predictions.filter(p =>
      activeTab === 'Active'
        ? ['Pending', 'Won'].includes(p.status)
        : ['Lost', 'Cancelled'].includes(p.status)
    ),
  [predictions, activeTab])

  // Stats
  const totalStaked     = predictions.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + Number(p.betAmount), 0)
  const activeSlips     = predictions.filter(p => p.status === 'Pending').length
  const wonPredictions  = predictions.filter(p => p.status === 'Won')
  const lostPredictions = predictions.filter(p => p.status === 'Lost')
  const winRate         = wonPredictions.length + lostPredictions.length > 0
    ? Math.round((wonPredictions.length / (wonPredictions.length + lostPredictions.length)) * 100)
    : 0

  const handleCancel = async (predId) => {
    setCancelling(predId)
    setCancelError('')
    try {
      await cancelPrediction(predId)
      await load()
    } catch (err) {
      setCancelError(err?.message || 'Huỷ dự đoán thất bại')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">My Predictions</h1>
                <p className="text-on-surface-variant text-sm">
                  Track your active stakes and review your past performance.
                </p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-3" />
          </div>

          {/* Tab toggle */}
          <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/40 rounded-xl p-1">
            {['Active', 'History'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
        {(error || cancelError) && (
          <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error || cancelError}
            <button onClick={() => { setError(''); setCancelError('') }} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp} iconCls="text-primary"   label="Total Staked"     value={`${fmtBalance(totalStaked)} pts`} />
          <StatCard icon={TrendingUp} iconCls="text-secondary" label="Potential Payout"  value="—" />
          <StatCard icon={Clock}      iconCls="text-amber-400" label="Active Slips"      value={activeSlips} />
          <StatCard icon={CheckCircle}iconCls="text-primary"   label="Win Rate (30D)"    value={`${winRate}%`} />
        </div>

        {/* Table */}
        <div className="gs-card overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between">
            <h2 className="font-semibold text-on-surface text-sm">
              {activeTab === 'Active' ? 'Active Slips' : 'Prediction History'}
              <span className="ml-2 text-on-surface-variant font-normal">({displayed.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-on-surface-variant/40" />
              </div>
              <p className="text-on-surface font-semibold mb-1">
                {activeTab === 'Active' ? 'No active predictions' : 'No prediction history'}
              </p>
              <p className="text-on-surface-variant text-sm">
                {activeTab === 'Active' ? 'Place a bet from the Races & Betting page.' : 'Your settled predictions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Race Event</th>
                    <th>Your Picks</th>
                    <th>Stake</th>
                    <th>Locked Odds</th>
                    <th>Status</th>
                    <th>Est. Payout</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((pred, i) => {
                    const race   = raceMap[pred.raceId]
                    const meta   = PRED_STATUS_META[pred.status] ?? PRED_STATUS_META.Pending
                    const canCancel = pred.status === 'Pending' && race?.status === 'Scheduled'

                    return (
                      <tr
                        key={pred.predictionId}
                        className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                        style={{ opacity: 0, animationFillMode: 'forwards' }}
                      >
                        {/* Race Event */}
                        <td>
                          <div className="font-semibold text-on-surface text-sm">{race?.name ?? `Race #${pred.raceId}`}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {race ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                                race.status === 'Scheduled' ? 'text-primary' : 'text-on-surface-variant'
                              }`}>
                                {race.status}
                              </span>
                            ) : '—'}
                          </div>
                        </td>

                        {/* Picks */}
                        <td>
                          <span className="text-sm text-primary font-medium">
                            Entry #{pred.firstEntryId}
                          </span>
                          <div className="text-xs text-on-surface-variant">Win</div>
                        </td>

                        {/* Stake */}
                        <td className="font-bold text-on-surface font-mono">
                          {fmtBalance(pred.betAmount)} pts
                        </td>

                        {/* Locked Odds */}
                        <td className="font-mono text-on-surface-variant text-sm">
                          {pred.oddsLocked1 > 1 ? `${pred.oddsLocked1}/1` : '—'}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>

                        {/* Est. Payout */}
                        <td className="font-mono text-sm">
                          {pred.status === 'Won'
                            ? <span className="text-secondary font-bold">{fmtBalance(pred.betAmount * 2)} pts</span>
                            : <span className="text-on-surface-variant">—</span>
                          }
                        </td>

                        {/* Action */}
                        <td>
                          {canCancel ? (
                            <button
                              disabled={cancelling === pred.predictionId}
                              onClick={() => handleCancel(pred.predictionId)}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                            >
                              {cancelling === pred.predictionId
                                ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                : <XCircle className="w-3.5 h-3.5" />
                              }
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
