import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wallet, Download, AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyWallet, getMyPredictions, getWalletTransactions } from '../../api/spectator'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const TX_TYPE_META = {
  BetWon:         { label: 'Bet Won',          cls: 'bg-primary/15 text-primary border border-primary/25' },
  BetPlaced:      { label: 'Bet Placed',        cls: 'bg-error/15 text-error border border-error/25' },
  TopUp:          { label: 'Top-Up',            cls: 'bg-primary/15 text-primary border border-primary/25' },
  WeeklyTopUp:    { label: 'Weekly Top-Up',     cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
  AdminDeduction: { label: 'Admin Deduction',   cls: 'bg-error/20 text-error border border-error/30' },
  Refund:         { label: 'Refund',            cls: 'bg-secondary/15 text-secondary border border-secondary/25' },
  PrizePayout:    { label: 'Prize Payout',      cls: 'bg-secondary/15 text-secondary border border-secondary/25' },
}

function getTxMeta(type) {
  return TX_TYPE_META[type] ?? { label: type, cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBalance(n) {
  return Number(n ?? 0).toLocaleString('en-US')
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTxDesc(tx) {
  if (tx.reason) return tx.reason
  switch (tx.type) {
    case 'BetPlaced':   return `Prediction #${tx.predictionId ?? '—'}`
    case 'BetWon':      return `Winning payout — Prediction #${tx.predictionId ?? '—'}`
    case 'WeeklyTopUp': return 'Standard Weekly Allowance'
    case 'TopUp':       return 'Manual Top-Up'
    default:            return tx.type
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PointWalletPage() {
  const { user } = useAuth()

  const [wallet,       setWallet]       = useState(null)
  const [transactions, setTransactions] = useState([])
  const [predictions,  setPredictions]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [page,         setPage]         = useState(1)
  const [typeFilter,   setTypeFilter]   = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [w, txAll, preds] = await Promise.all([
        getMyWallet(user?.userId),
        getWalletTransactions(),
        getMyPredictions(user?.userId),
      ])
      setWallet(w)
      // Filter transactions that belong to this spectator's wallet
      const myWalletId = w?.walletId
      setTransactions(
        myWalletId
          ? txAll.filter(t => t.walletId === myWalletId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : []
      )
      setPredictions(Array.isArray(preds) ? preds : [])
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => { load() }, [load])

  // ── Derived stats ──
  const pendingAmount = useMemo(
    () => predictions.filter(p => p.status === 'Pending').reduce((s, p) => s + Number(p.betAmount), 0),
    [predictions],
  )
  const stakedAmount = useMemo(
    () => predictions.filter(p => ['Pending', 'Won', 'Lost'].includes(p.status)).reduce((s, p) => s + Number(p.betAmount), 0),
    [predictions],
  )

  // ── Filtered & paginated ──
  const txTypes = useMemo(() => ['All', ...new Set(transactions.map(t => t.type))], [transactions])

  const filtered = useMemo(() =>
    typeFilter === 'All' ? transactions : transactions.filter(t => t.type === typeFilter),
  [transactions, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                <Wallet size={20} className="text-secondary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Point Wallet</h1>
                <p className="text-on-surface-variant text-sm">Manage your funds and track your transaction history.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-secondary to-primary mt-3" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button className="gs-btn gs-btn-ghost flex items-center gap-2">
              <Download size={15} />
              Statement
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        {/* Balance card */}
        <div
          className="rounded-2xl p-6 mb-8 animate-fade-in-up delay-row-1"
          style={{
            opacity: 0,
            animationFillMode: 'forwards',
            background: 'linear-gradient(135deg, #3d2e00 0%, #1a1400 60%, #0b141c 100%)',
            border: '1px solid rgba(230, 195, 100, 0.25)',
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Wallet size={12} />
                Current Balance
              </p>
              <p className="text-5xl font-bold font-mono text-on-surface">
                {loading ? '—' : fmtBalance(wallet?.balance ?? 0)}
                <span className="text-2xl font-normal text-on-surface-variant ml-2">pts</span>
              </p>
            </div>

            <div className="flex gap-4">
              <div className="gs-card px-5 py-3 text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <p className="text-xs text-on-surface-variant mb-1">Pending</p>
                <p className="text-xl font-bold font-mono text-on-surface">
                  {loading ? '—' : fmtBalance(pendingAmount)}
                </p>
              </div>
              <div className="gs-card px-5 py-3 text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <p className="text-xs text-on-surface-variant mb-1">Staked</p>
                <p className="text-xl font-bold font-mono text-on-surface">
                  {loading ? '—' : fmtBalance(stakedAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="gs-card overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif font-bold text-on-surface text-lg">Transaction History</h2>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-on-surface-variant" />
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all"
              >
                {txTypes.map(t => (
                  <option key={t} value={t}>{t === 'All' ? 'All Types' : getTxMeta(t).label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Wallet size={28} className="text-on-surface-variant/40" />
              </div>
              <p className="text-on-surface font-semibold mb-1">No transactions yet</p>
              <p className="text-on-surface-variant text-sm">Your transaction history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, i) => {
                    const meta      = getTxMeta(tx.type)
                    const isCredit  = Number(tx.amount) > 0

                    return (
                      <tr
                        key={tx.walletTransactionId}
                        className={`animate-fade-in-up delay-row-${(i % 4) + 1}`}
                        style={{ opacity: 0, animationFillMode: 'forwards' }}
                      >
                        <td className="text-sm text-on-surface-variant font-mono whitespace-nowrap">
                          {fmtDate(tx.createdAt)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="text-sm text-on-surface">
                          {fmtTxDesc(tx)}
                        </td>
                        <td className="text-right">
                          <span className={`font-bold font-mono text-sm ${isCredit ? 'text-primary' : 'text-error'}`}>
                            {isCredit ? '+' : ''}{fmtBalance(tx.amount)} pts
                          </span>
                        </td>
                        <td className="text-right text-sm font-mono text-on-surface">
                          {fmtBalance(tx.balanceAfter)} pts
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
              <span className="text-xs text-on-surface-variant">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gs-btn gs-btn-ghost gs-btn-sm px-2"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`gs-btn gs-btn-sm min-w-[32px] justify-center ${page === p ? 'gs-btn-secondary' : 'gs-btn-ghost'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="gs-btn gs-btn-ghost gs-btn-sm px-2"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
