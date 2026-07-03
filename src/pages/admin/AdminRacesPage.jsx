import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Flag, Plus, ChevronDown, Edit2, Trash2, X, AlertCircle,
  Users, CheckCircle, Clock, XCircle, ArrowLeft, UserCheck,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import {
  getTournaments, getRaces, getRaceDetail, createRace, updateRace, deleteRace,
  getUsers,
} from '../../api/admin'
import api from '../../services/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUND_TYPES = ['Qualifying', 'Semifinal', 'Final', 'Regular']

const RACE_STATUS_META = {
  Scheduled:     { label: 'Scheduled',       cls: 'bg-primary/15 text-primary border border-primary/25' },
  InProgress:    { label: 'In Progress',      cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' },
  Paused:        { label: 'Paused',           cls: 'bg-secondary/15 text-secondary border border-secondary/25' },
  PendingResult: { label: 'Pending Result',   cls: 'bg-blue-400/15 text-blue-400 border border-blue-400/25' },
  Finished:      { label: 'Finished',         cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' },
  Cancelled:     { label: 'Cancelled',        cls: 'bg-error/15 text-error border border-error/25' },
}

const ENTRY_STATUS_META = {
  Pending:   { label: 'Pending Review', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25', dot: 'bg-amber-400' },
  Approved:  { label: 'Approved',       cls: 'bg-primary/15 text-primary border border-primary/25',      dot: 'bg-primary' },
  Rejected:  { label: 'Rejected',       cls: 'bg-error/15 text-error border border-error/25',            dot: 'bg-error' },
  Withdrawn: { label: 'Withdrawn',      cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50', dot: 'bg-on-surface-variant' },
}

function fmtRaceId(id) {
  return `#RC-${new Date().getFullYear()}-${String(id).padStart(2, '0')}`
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

function toDatetimeLocal(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconCls, label, value, sub }) {
  return (
    <div className="gs-card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-on-surface font-mono">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Race Modal (Create / Edit) ───────────────────────────────────────────────

function RaceModal({ race, tournaments, users, selectedTournamentId, onClose, onSubmit, submitting, error }) {
  const isEdit = !!race
  const [form, setForm] = useState({
    tournamentId:       race?.tournamentId       ?? selectedTournamentId ?? '',
    name:               race?.name               ?? '',
    scheduledStartTime: toDatetimeLocal(race?.scheduledStartTime),
    numberOfLegs:       race?.numberOfLegs       ?? 3,
    maxHorses:          race?.maxHorses          ?? 14,
    roundType:          race?.roundType          ?? 'Regular',
    referee1Id:         race?.referee1Id         ?? '',
    referee2Id:         race?.referee2Id         ?? '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = k => e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))

  const handleSubmit = e => {
    e.preventDefault()
    if (form.referee1Id && form.referee2Id && form.referee1Id === form.referee2Id) {
      return
    }
    onSubmit({
      tournamentId:       Number(form.tournamentId),
      name:               form.name.trim(),
      scheduledStartTime: new Date(form.scheduledStartTime).toISOString(),
      numberOfLegs:       Number(form.numberOfLegs),
      maxHorses:          Number(form.maxHorses),
      roundType:          form.roundType,
      referee1Id:         Number(form.referee1Id) || 0,
      referee2Id:         Number(form.referee2Id) || 0,
    })
  }

  const refereeMismatch = form.referee1Id && form.referee2Id && form.referee1Id === form.referee2Id

  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="gs-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">
              {isEdit ? 'Edit Race' : 'Create Race'}
            </h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {refereeMismatch && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />Referee 1 và Referee 2 phải khác nhau
            </div>
          )}

          {/* Tournament */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tournament <span className="text-error">*</span>
            </label>
            <select required value={form.tournamentId} onChange={set('tournamentId')} className={inputCls}>
              <option value="">-- Select tournament --</option>
              {tournaments.map(t => (
                <option key={t.tournamentId} value={t.tournamentId}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Race Name <span className="text-error">*</span>
            </label>
            <input required value={form.name} onChange={set('name')}
              placeholder="e.g. Al Maktoum Challenge" className={inputCls} />
          </div>

          {/* Scheduled time */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Scheduled Start Time <span className="text-error">*</span>
            </label>
            <input required type="datetime-local" value={form.scheduledStartTime}
              onChange={set('scheduledStartTime')} className={inputCls} />
          </div>

          {/* Legs + Max Horses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Number of Legs <span className="text-error">*</span>
              </label>
              <input required type="number" min={1} max={10} value={form.numberOfLegs}
                onChange={setNum('numberOfLegs')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Max Horses <span className="text-error">*</span>
              </label>
              <input required type="number" min={2} max={30} value={form.maxHorses}
                onChange={setNum('maxHorses')} className={inputCls} />
            </div>
          </div>

          {/* Round Type */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Round Type <span className="text-error">*</span>
            </label>
            <select required value={form.roundType} onChange={set('roundType')} className={inputCls}>
              {ROUND_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Referees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Referee 1 <span className="text-error">*</span>
              </label>
              <select required value={form.referee1Id} onChange={set('referee1Id')} className={inputCls}>
                <option value="">-- Select --</option>
                {users.map(u => (
                  <option key={u.userId} value={u.userId}>{u.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Referee 2 <span className="text-error">*</span>
              </label>
              <select required value={form.referee2Id} onChange={set('referee2Id')} className={inputCls}>
                <option value="">-- Select --</option>
                {users.filter(u => String(u.userId) !== String(form.referee1Id)).map(u => (
                  <option key={u.userId} value={u.userId}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting || refereeMismatch}
              className="gs-btn gs-btn-primary flex items-center gap-2">
              {submitting && <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Race'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRacesPage() {
  // ── Data ──
  const [tournaments, setTournaments] = useState([])
  const [raceDetails, setRaceDetails] = useState([])   // full detail of all races
  const [entries, setEntries]         = useState([])   // all entries
  const [horses, setHorses]           = useState([])   // for name lookup
  const [users, setUsers]             = useState([])   // for referee name lookup

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // ── Filters ──
  const [selectedTournamentId, setSelectedTournamentId] = useState('')

  // ── View: 'races' | 'entries' ──
  const [view, setView]         = useState('races')
  const [activeRace, setActiveRace] = useState(null)

  // ── Modal ──
  const [showModal, setShowModal]   = useState(false)
  const [editingRace, setEditingRace] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // ── Entry approve/reject ──
  const [entryAction, setEntryAction] = useState(null) // { id, type }
  const [entryError, setEntryError]   = useState('')

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tournamentsData, racesBasic, entriesData, horsesData, usersData] = await Promise.all([
        getTournaments(),
        getRaces(),
        api.get('/api/entries').then(r => r.data),
        api.get('/api/horses').then(r => r.data),
        getUsers(),
      ])

      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      setHorses(Array.isArray(horsesData) ? horsesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])

      // Fetch full race details in parallel (needed for TournamentId)
      const raceList = Array.isArray(racesBasic) ? racesBasic : []
      if (raceList.length > 0) {
        const details = await Promise.all(raceList.map(r => getRaceDetail(r.raceId)))
        setRaceDetails(details.filter(Boolean))
      } else {
        setRaceDetails([])
      }
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Derived data ──────────────────────────────────────────────────────────
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.horseId, h])), [horses])
  const userMap  = useMemo(() => Object.fromEntries(users.map(u => [u.userId, u])),   [users])

  const filteredRaces = useMemo(() =>
    selectedTournamentId
      ? raceDetails.filter(r => String(r.tournamentId) === String(selectedTournamentId))
      : raceDetails,
  [raceDetails, selectedTournamentId])

  // Stats for race list view
  const statsRaces = useMemo(() => {
    const active    = filteredRaces.filter(r => ['Scheduled','InProgress'].includes(r.status)).length
    const withRefs  = filteredRaces.filter(r => r.referee1Id && r.referee2Id).length
    const noRefs    = filteredRaces.filter(r => !r.referee1Id || !r.referee2Id).length
    const totalEntries = entries.filter(e =>
      filteredRaces.some(r => r.raceId === e.raceId)
    ).length
    return { active, withRefs, total: filteredRaces.length, totalEntries, noRefs }
  }, [filteredRaces, entries])

  // Entries for active race (entries view)
  const raceEntries = useMemo(() =>
    activeRace ? entries.filter(e => e.raceId === activeRace.raceId) : [],
  [entries, activeRace])

  const entryStats = useMemo(() => ({
    total:    activeRace?.maxHorses ?? 0,
    filled:   raceEntries.length,
    approved: raceEntries.filter(e => e.status === 'Approved').length,
    pending:  raceEntries.filter(e => e.status === 'Pending').length,
    rejected: raceEntries.filter(e => e.status === 'Rejected').length,
  }), [raceEntries, activeRace])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditingRace(null); setFormError(''); setShowModal(true) }
  const openEdit   = (r)  => { setEditingRace(r);   setFormError(''); setShowModal(true) }

  const handleDelete = async (id) => {
    setError('')
    try {
      await deleteRace(id)
      setDeletingId(null)
      await loadAll()
    } catch (err) {
      setError(err?.message || 'Xóa race thất bại')
      setDeletingId(null)
    }
  }

  const handleRaceSubmit = async (formData) => {
    setSubmitting(true)
    setFormError('')
    try {
      if (editingRace) {
        await updateRace(editingRace.raceId, { raceId: editingRace.raceId, ...formData })
      } else {
        await createRace(formData)
      }
      setShowModal(false)
      await loadAll()
    } catch (err) {
      setFormError(err?.message || 'Lưu race thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const openEntriesView = (race) => {
    setActiveRace(race)
    setView('entries')
    setEntryError('')
  }

  const handleEntryStatus = async (entryId, status) => {
    setEntryAction({ id: entryId, type: status })
    setEntryError('')
    try {
      await api.put(`/api/entries/${entryId}`, { entryId, status, gateNumber: null })
      await loadAll()
    } catch (err) {
      setEntryError(err?.message || 'Cập nhật entry thất bại')
    } finally {
      setEntryAction(null)
    }
  }

  // ── Render: Races View ─────────────────────────────────────────────────────
  if (view === 'races') {
    return (
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="animate-fade-in-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Flag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-on-surface">Race Management</h1>
                <p className="text-on-surface-variant text-sm">Manage races, assign referees, and oversee entries.</p>
              </div>
            </div>
            <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-3" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Tournament selector */}
            <div className="relative">
              <select
                value={selectedTournamentId}
                onChange={e => setSelectedTournamentId(e.target.value)}
                className="appearance-none bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-9 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all cursor-pointer min-w-[200px]"
              >
                <option value="">All Tournaments</option>
                {tournaments.map(t => (
                  <option key={t.tournamentId} value={t.tournamentId}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>

            <button onClick={openCreate} className="gs-btn gs-btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Race
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Flag}      iconCls="bg-primary/10 border border-primary/20 text-primary"         label="Active Races"        value={statsRaces.active}        />
          <StatCard icon={Users}     iconCls="bg-secondary/10 border border-secondary/20 text-secondary"   label="Total Entries"        value={statsRaces.totalEntries}  />
          <StatCard icon={UserCheck} iconCls="bg-blue-400/10 border border-blue-400/20 text-blue-400"      label="Referees Assigned"    value={`${statsRaces.withRefs}/${statsRaces.total}`} />
          <StatCard icon={AlertCircle} iconCls="bg-error/10 border border-error/20 text-error"             label="Pending Ref. Assign"  value={statsRaces.noRefs}        />
        </div>

        {/* Table card */}
        <div className="gs-card overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between">
            <h2 className="font-semibold text-on-surface text-sm">
              {selectedTournamentId
                ? `Races — ${tournaments.find(t => String(t.tournamentId) === String(selectedTournamentId))?.name ?? ''}`
                : 'All Races'}
              <span className="ml-2 text-on-surface-variant font-normal">({filteredRaces.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 flex-col gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">Loading races...</span>
            </div>
          ) : filteredRaces.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
                <Flag className="w-7 h-7 text-on-surface-variant/40" />
              </div>
              <p className="text-on-surface font-semibold mb-1">No races found</p>
              <p className="text-on-surface-variant text-sm">
                {selectedTournamentId ? 'No races in this tournament yet.' : 'Click "Create Race" to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Race Name</th>
                    <th>Date &amp; Time</th>
                    <th>Legs / Type</th>
                    <th>Entries</th>
                    <th>Referees</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRaces.map((race, i) => {
                    const dt = fmtDateTime(race.scheduledStartTime)
                    const raceEntryList = entries.filter(e => e.raceId === race.raceId)
                    const meta = RACE_STATUS_META[race.status] ?? { label: race.status, cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' }
                    const ref1 = race.referee1Id ? userMap[race.referee1Id] : null
                    const ref2 = race.referee2Id ? userMap[race.referee2Id] : null

                    return (
                      <tr key={race.raceId} className={`animate-fade-in-up delay-row-${(i % 4)+1}`} style={{ opacity: 0, animationFillMode: 'forwards' }}>

                        {/* Name */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-1 h-8 rounded-full bg-primary/60 shrink-0" />
                            <div>
                              <div className="font-semibold text-on-surface text-sm">{race.name}</div>
                              <div className="text-[11px] text-on-surface-variant font-mono">ID: {fmtRaceId(race.raceId)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Date/Time */}
                        <td>
                          <div className="text-sm text-on-surface">{dt.date}</div>
                          <div className="text-xs text-on-surface-variant">{dt.time}</div>
                        </td>

                        {/* Legs / Round type */}
                        <td>
                          <div className="text-sm text-on-surface">{race.numberOfLegs} Leg{race.numberOfLegs > 1 ? 's' : ''}</div>
                          <div className="text-xs text-on-surface-variant">{race.roundType}</div>
                        </td>

                        {/* Entries progress */}
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-on-surface">
                              {raceEntryList.length}/{race.maxHorses}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, (raceEntryList.length / race.maxHorses) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Referees */}
                        <td>
                          {ref1 || ref2 ? (
                            <div className="flex flex-col gap-0.5">
                              {ref1 && <span className="text-xs text-on-surface">{ref1.fullName}</span>}
                              {ref2 && <span className="text-xs text-on-surface-variant">{ref2.fullName}</span>}
                            </div>
                          ) : (
                            <button onClick={() => openEdit(race)}
                              className="text-xs text-secondary hover:text-secondary/80 flex items-center gap-1 transition-colors">
                              <Plus className="w-3 h-3" /> Assign
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          {deletingId === race.raceId ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-error">Confirm?</span>
                              <button onClick={() => handleDelete(race.raceId)} className="gs-btn gs-btn-danger gs-btn-sm">Delete</button>
                              <button onClick={() => setDeletingId(null)} className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button onClick={() => openEntriesView(race)}
                                className="gs-btn gs-btn-outline-emerald gs-btn-sm flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> Entries
                              </button>
                              <button onClick={() => openEdit(race)}
                                className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1">
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => setDeletingId(race.raceId)}
                                className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* Modal */}
        {showModal && (
          <RaceModal
            race={editingRace}
            tournaments={tournaments}
            users={users}
            selectedTournamentId={selectedTournamentId}
            onClose={() => setShowModal(false)}
            onSubmit={handleRaceSubmit}
            submitting={submitting}
            error={formError}
          />
        )}
      </div>
    )
  }

  // ── Render: Entries View ───────────────────────────────────────────────────
  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* Breadcrumb + back */}
      <button
        onClick={() => { setView('races'); setActiveRace(null) }}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Race Management
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          {selectedTournamentId && (
            <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              {tournaments.find(t => String(t.tournamentId) === String(selectedTournamentId))?.name}
            </p>
          )}
          <h1 className="font-serif text-2xl font-bold text-on-surface">Race Entries Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">{activeRace?.name}</p>
        </div>

        {/* Close Registration — disabled until BE supports it */}
        <button disabled title="Requires BE support for RegistrationCloseAt"
          className="gs-btn gs-btn-ghost flex items-center gap-2 opacity-40 cursor-not-allowed">
          Close Registration
        </button>
      </div>

      {entryError && (
        <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{entryError}
          <button onClick={() => setEntryError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Entry Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}       iconCls="bg-primary/10 border border-primary/20 text-primary"       label="Total Capacity"   value={`${entryStats.filled}/${entryStats.total}`} sub="Slots Filled" />
        <StatCard icon={CheckCircle} iconCls="bg-primary/10 border border-primary/20 text-primary"       label="Approved Entries" value={entryStats.approved} />
        <StatCard icon={Clock}       iconCls="bg-amber-500/10 border border-amber-500/20 text-amber-400" label="Pending Review"   value={entryStats.pending}  sub={entryStats.pending > 0 ? 'Needs Action' : ''} />
        <StatCard icon={XCircle}     iconCls="bg-error/10 border border-error/20 text-error"             label="Rejected"         value={entryStats.rejected} />
      </div>

      {/* Entries Table */}
      <div className="gs-card overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/40">
          <h2 className="font-semibold text-on-surface text-sm">
            Pending &amp; Approved Entries
            <span className="ml-2 text-on-surface-variant font-normal">({raceEntries.length})</span>
          </h2>
        </div>

        {raceEntries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-on-surface font-semibold mb-1">No entries yet</p>
            <p className="text-on-surface-variant text-sm">Entries submitted by horse owners will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Horse</th>
                  <th>Entry ID</th>
                  <th>Gate #</th>
                  <th>Current Odds</th>
                  <th>Status</th>
                  <th>Review Action</th>
                </tr>
              </thead>
              <tbody>
                {raceEntries.map((entry, i) => {
                  const horse = horseMap[entry.horseId]
                  const meta  = ENTRY_STATUS_META[entry.status] ?? ENTRY_STATUS_META.Pending
                  const isActing = entryAction?.id === entry.entryId

                  return (
                    <tr key={entry.entryId} className={`animate-fade-in-up delay-row-${(i%4)+1}`} style={{ opacity: 0, animationFillMode: 'forwards' }}>

                      {/* Horse */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-sm font-bold text-on-surface-variant shrink-0">
                            {horse?.name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface text-sm">
                              {horse?.name ?? `Horse #${entry.horseId}`}
                            </div>
                            {horse?.breed && (
                              <div className="text-xs text-on-surface-variant">{horse.breed}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="font-mono text-xs text-on-surface-variant">#{entry.entryId}</td>
                      <td className="text-sm text-on-surface-variant">{entry.gateNumber ?? '—'}</td>

                      {/* Odds — not available from BE yet */}
                      <td className="text-sm text-on-surface-variant font-mono">—</td>

                      {/* Status */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        {entry.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={isActing}
                              onClick={() => handleEntryStatus(entry.entryId, 'Approved')}
                              className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
                            >
                              {isActing && entryAction?.type === 'Approved'
                                ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />}
                              Approve
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleEntryStatus(entry.entryId, 'Rejected')}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                            >
                              {isActing && entryAction?.type === 'Rejected'
                                ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                : <XCircle className="w-3.5 h-3.5" />}
                              Reject
                            </button>
                          </div>
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
  )
}
