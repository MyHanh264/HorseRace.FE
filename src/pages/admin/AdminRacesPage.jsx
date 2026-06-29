import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Flag, Plus, ChevronDown, Edit2, Trash2, X, AlertCircle,
  Users, CheckCircle, XCircle, ArrowLeft, UserCheck, Eye,
  LockOpen, Lock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getTournaments, getRaces, getRaceDetail, createRace, updateRace, deleteRace,
  getUsers, approveEntry, rejectEntry, openRegistration, closeRegistration, startRace,
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

function RaceModal({ race, tournaments, users, allRaces, selectedTournamentId, onClose, onSubmit, submitting, error }) {
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

  const refereeConflict = useMemo(() => {
    if (!form.scheduledStartTime || (!form.referee1Id && !form.referee2Id)) return null
    const currentTourId = Number(form.tournamentId)
    const st = new Date(form.scheduledStartTime)
    const sameTime = (dt) => {
      if (!dt) return false
      const d = new Date(dt)
      return d.getFullYear() === st.getFullYear() &&
        d.getMonth()    === st.getMonth()    &&
        d.getDate()     === st.getDate()     &&
        d.getHours()    === st.getHours()    &&
        d.getMinutes()  === st.getMinutes()
    }
    const ref1 = String(form.referee1Id)
    const ref2 = String(form.referee2Id)
    return allRaces.find(r => {
      if (r.tournamentId === currentTourId) return false
      if (r.raceId === race?.raceId)        return false
      if (!sameTime(r.scheduledStartTime))  return false
      return (
        (ref1 && (String(r.referee1Id) === ref1 || String(r.referee2Id) === ref1)) ||
        (ref2 && (String(r.referee1Id) === ref2 || String(r.referee2Id) === ref2))
      )
    }) ?? null
  }, [form.referee1Id, form.referee2Id, form.scheduledStartTime, form.tournamentId, allRaces, race])

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
          {refereeConflict && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Trọng tài đã được assign vào race <strong>"{refereeConflict.name}"</strong> (tournament khác) cùng khung giờ này. Bạn vẫn có thể tiếp tục.
              </span>
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

          {/* Scheduled time — split into date + time pickers */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Scheduled Start Time <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Date picker — opens calendar */}
              <input
                required
                type="date"
                value={form.scheduledStartTime?.split('T')[0] ?? ''}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const time = form.scheduledStartTime?.split('T')[1] ?? '08:00';
                  setForm(f => ({ ...f, scheduledStartTime: `${e.target.value}T${time}` }));
                }}
                className={inputCls}
              />
              {/* Time picker */}
              <input
                required
                type="time"
                value={form.scheduledStartTime?.split('T')[1]?.slice(0, 5) ?? ''}
                onChange={e => {
                  const date = form.scheduledStartTime?.split('T')[0] ?? '';
                  setForm(f => ({ ...f, scheduledStartTime: `${date}T${e.target.value}` }));
                }}
                className={inputCls}
              />
            </div>
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
  const navigate = useNavigate()

  // ── Data ──
  const [tournaments, setTournaments] = useState([])
  const [raceDetails, setRaceDetails] = useState([])   // full detail of all races
  const [entries, setEntries]         = useState([])   // all entries
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
  const [entryAction, setEntryAction]   = useState(null) // { id, type }
  const [entryError, setEntryError]     = useState('')
  const [rejectingEntryId, setRejectingEntryId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Registration open/close ──
  const [regLoading, setRegLoading] = useState(null) // raceId đang xử lý
  // raceId → { registrationOpenAt, registrationCloseAt } từ list endpoint (detail endpoint thiếu 2 field này)
  const [raceRegMap, setRaceRegMap] = useState({})

  const buildRegMap = (raceList) => {
    const map = {}
    raceList.forEach(r => {
      map[r.raceId] = {
        registrationOpenAt:  r.registrationOpenAt  ?? null,
        registrationCloseAt: r.registrationCloseAt ?? null,
      }
    })
    return map
  }

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [tournamentsData, racesBasic, entriesData, usersData] = await Promise.all([
        getTournaments(),
        getRaces(),
        api.get('/api/entries').then(r => r.data),
        getUsers(),
      ])

      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setError('')

      const raceList = Array.isArray(racesBasic) ? racesBasic : []
      setRaceRegMap(buildRegMap(raceList))

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

  useEffect(() => {
    Promise.all([
      getTournaments(),
      getRaces(),
      api.get('/api/entries').then(r => r.data),
      getUsers(),
    ])
      .then(([tournamentsData, racesBasic, entriesData, usersData]) => {
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
        setEntries(Array.isArray(entriesData) ? entriesData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
        const raceList = Array.isArray(racesBasic) ? racesBasic : []
        setRaceRegMap(buildRegMap(raceList))
        if (raceList.length > 0) {
          return Promise.all(raceList.map(r => getRaceDetail(r.raceId)))
            .then(details => setRaceDetails(details.filter(Boolean)))
        }
        setRaceDetails([])
      })
      .catch(err => setError(err?.message || 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived data ──────────────────────────────────────────────────────────
  const userMap       = useMemo(() => Object.fromEntries(users.map(u => [u.userId, u])),             [users])
  const tournamentMap = useMemo(() => Object.fromEntries(tournaments.map(t => [t.tournamentId, t.name])), [tournaments])

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

  const handleOpenRegistration = async (raceId) => {
    setRegLoading(raceId)
    setError('')
    try {
      await openRegistration(raceId)
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Mở đăng ký thất bại')
    } finally {
      setRegLoading(null)
    }
  }

  const handleCloseRegistration = async (raceId) => {
    setRegLoading(raceId)
    setError('')
    try {
      await closeRegistration(raceId)
      await loadAll()
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Đóng đăng ký thất bại')
    } finally {
      setRegLoading(null)
    }
  }

  const handleStartRace = async (raceId) => {
    setRegLoading(raceId)
    setError('')
    try {
      await startRace(raceId)
      await loadAll()
      setView('races')
      setActiveRace(null)
    } catch (err) {
      setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Bắt đầu race thất bại')
    } finally {
      setRegLoading(null)
    }
  }

  const handleApproveEntry = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Approved' })
    setEntryError('')
    try {
      await approveEntry(entryId)
      await loadAll()
    } catch (err) {
      setEntryError(err?.message || 'Duyệt entry thất bại')
    } finally {
      setEntryAction(null)
    }
  }

  const handleRejectEntry = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Rejected' })
    setEntryError('')
    try {
      await rejectEntry(entryId, rejectReason.trim() || null)
      setRejectingEntryId(null)
      setRejectReason('')
      await loadAll()
    } catch (err) {
      setEntryError(err?.message || 'Từ chối entry thất bại')
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
              <Plus className="w-4 h-4" /> Create Race
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
          <StatCard icon={Flag}        iconCls="bg-primary/10 border border-primary/20 text-primary"       label="Active Races"       value={statsRaces.active} />
          <StatCard icon={Users}       iconCls="bg-secondary/10 border border-secondary/20 text-secondary" label="Total Entries"       value={statsRaces.totalEntries} />
          <StatCard icon={UserCheck}   iconCls="bg-blue-400/10 border border-blue-400/20 text-blue-400"    label="Referees Assigned"  value={`${statsRaces.withRefs}/${statsRaces.total}`} />
          <StatCard icon={AlertCircle} iconCls="bg-error/10 border border-error/20 text-error"             label="Pending Ref. Assign" value={statsRaces.noRefs} />
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
                              {tournamentMap[race.tournamentId] && (
                                <div className="text-[11px] text-secondary mt-0.5">🏆 {tournamentMap[race.tournamentId]}</div>
                              )}
                              <div className="text-[11px] text-on-surface-variant font-mono">{fmtRaceId(race.raceId)}</div>
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
                              {race.status === 'Scheduled' && !raceRegMap[race.raceId]?.registrationOpenAt && (
                                <button
                                  onClick={() => handleOpenRegistration(race.raceId)}
                                  disabled={regLoading === race.raceId}
                                  className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1">
                                  {regLoading === race.raceId
                                    ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                                    : <LockOpen className="w-3.5 h-3.5" />}
                                  Open Reg
                                </button>
                              )}
                              {race.status === 'Scheduled' && raceRegMap[race.raceId]?.registrationOpenAt && !raceRegMap[race.raceId]?.registrationCloseAt && (
                                <button
                                  onClick={() => handleCloseRegistration(race.raceId)}
                                  disabled={regLoading === race.raceId}
                                  className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1">
                                  {regLoading === race.raceId
                                    ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                    : <Lock className="w-3.5 h-3.5" />}
                                  Close Reg
                                </button>
                              )}
                              {(race.status === 'InProgress' || race.status === 'Paused') && (
                                <button onClick={() => navigate('/admin/race-execution')}
                                  className="gs-btn gs-btn-outline-gold gs-btn-sm flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> Monitor
                                </button>
                              )}
                              <button onClick={() => navigate(`/admin/races/${race.raceId}/entries`)}
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

      {showModal && (
        <RaceModal
          race={editingRace}
          tournaments={tournaments}
          users={users}
          allRaces={raceDetails}
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
  const regInfo    = raceRegMap[activeRace?.raceId] ?? {}
  const isRegOpen  = !!regInfo.registrationOpenAt && !regInfo.registrationCloseAt
  const isRegClosed = !!regInfo.registrationCloseAt

  const regStatusLabel = isRegClosed ? 'Calculation Complete'
    : isRegOpen ? 'Accepting Entries'
    : 'Registration Not Open'
  const regStatusCls = isRegClosed ? 'text-amber-400'
    : isRegOpen ? 'text-primary'
    : 'text-on-surface-variant'

  const minOdds = Math.min(...raceEntries.filter(e => e.currentOdds).map(e => e.currentOdds))
  const fmtDate = (s) => {
    if (!s) return '—'
    const d = new Date(s)
    return `${d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}, ${d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}`
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">

      {/* Back */}
      <button
        onClick={() => { setView('races'); setActiveRace(null) }}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Race Management
      </button>

      {/* Closed banner */}
      {isRegClosed && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3 mb-5 text-amber-400 text-sm font-semibold">
          <Lock className="w-4 h-4 shrink-0" /> Registration Closed · Odds Locked
        </div>
      )}

      {/* Error */}
      {entryError && (
        <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{entryError}
          <button onClick={() => setEntryError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Race header card */}
      <div className="gs-card p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              {raceEntries[0]?.tournamentName ?? tournamentMap[activeRace?.tournamentId] ?? '—'}
            </p>
            <h1 className="text-2xl font-bold text-on-surface">{activeRace?.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <p className={`text-sm font-semibold ${regStatusCls}`}>{regStatusLabel}</p>
              {activeRace?.roundType && (
                <span className="text-xs text-on-surface-variant border border-outline-variant/40 rounded-full px-2 py-0.5">{activeRace.roundType}</span>
              )}
              {activeRace?.scheduledStartTime && (
                <span className="text-xs text-on-surface-variant">{fmtDate(activeRace.scheduledStartTime)}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isRegOpen && (
              <button
                onClick={() => handleCloseRegistration(activeRace.raceId)}
                disabled={regLoading === activeRace?.raceId}
                className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5"
              >
                {regLoading === activeRace?.raceId
                  ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                  : <Lock className="w-4 h-4" />}
                Close Registration
              </button>
            )}
            {isRegClosed && activeRace?.status === 'Scheduled' && (
              <button
                onClick={() => handleStartRace(activeRace.raceId)}
                disabled={regLoading === activeRace?.raceId}
                className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5"
              >
                {regLoading === activeRace?.raceId
                  ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                  : <span>▶</span>}
                Start Race
              </button>
            )}
          </div>
        </div>

        {/* Referees */}
        {(() => {
          const ref1 = activeRace?.referee1Id ? userMap[activeRace.referee1Id] : null
          const ref2 = activeRace?.referee2Id ? userMap[activeRace.referee2Id] : null
          return (
            <div className="mt-4 pt-4 border-t border-outline-variant/25">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3" /> Assigned Referees
              </p>
              {ref1 || ref2 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {[ref1, ref2].filter(Boolean).map((ref, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                        {ref.fullName?.charAt(0) ?? 'R'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-on-surface leading-tight">{ref.fullName}</p>
                        <p className="text-[10px] text-on-surface-variant">Referee {idx + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-error">No referees assigned</span>
                  <button onClick={() => openEdit(activeRace)}
                    className="text-xs text-primary hover:underline">Assign now →</button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-outline-variant/25">
          {[
            { label: 'CAPACITY',  value: `${entryStats.filled}/${entryStats.total}` },
            { label: 'APPROVED',  value: entryStats.approved },
            { label: 'PENDING',   value: entryStats.pending },
            { label: 'REJECTED',  value: entryStats.rejected },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mb-1">{label}</p>
              <p className="text-2xl font-bold font-mono text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Entries table */}
      <div className="gs-card overflow-hidden">
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
                  <th>Horse / Jockey</th>
                  <th>Owner</th>
                  <th>Submitted</th>
                  <th>
                    {isRegClosed
                      ? <span className="flex items-center gap-1">Locked Odds <Lock className="w-3 h-3 text-amber-400" /></span>
                      : <span className="flex flex-col leading-tight">Current Odds<span className="text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">(calculated on close)</span></span>}
                  </th>
                  <th>Status</th>
                  {!isRegClosed && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {raceEntries.map((entry, i) => {
                  const meta     = ENTRY_STATUS_META[entry.status] ?? ENTRY_STATUS_META.Pending
                  const isActing = entryAction?.id === entry.entryId
                  const isFav    = isRegClosed && entry.currentOdds && entry.currentOdds === minOdds
                  const isDim    = entry.status === 'Rejected'

                  return (
                    <tr key={entry.entryId}
                      className={`animate-fade-in-up delay-row-${(i%4)+1} ${isDim ? 'opacity-50' : ''}`}
                      style={{ opacity: isDim ? undefined : 0, animationFillMode: 'forwards' }}
                    >
                      {/* Horse / Jockey */}
                      <td>
                        <div className="flex items-center gap-3">
                          {isDim
                            ? <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant/40 flex items-center justify-center shrink-0 text-on-surface-variant text-lg">✕</div>
                            : <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                                {(entry.horseName ?? '?').charAt(0)}
                              </div>
                          }
                          <div>
                            <p className="font-semibold text-on-surface text-sm leading-tight">{entry.horseName ?? `Horse #${entry.horseId}`}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">{entry.jockeyName ?? `Jockey #${entry.jockeyId}`}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="text-sm text-on-surface-variant">{entry.horseOwnerName ?? '—'}</td>

                      {/* Submitted */}
                      <td className="text-sm text-on-surface-variant whitespace-nowrap">{fmtDate(entry.submittedAt)}</td>

                      {/* Odds */}
                      <td>
                        {isRegClosed ? (
                          entry.currentOdds
                            ? <span className="flex items-center gap-1.5">
                                <span className="font-bold text-on-surface font-mono">{entry.currentOdds}</span>
                                <Lock className="w-3 h-3 text-amber-400" />
                                {isFav && <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-semibold">Fav</span>}
                              </span>
                            : <span className="text-on-surface-variant">—</span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Actions — only when registration open */}
                      {!isRegClosed && (
                        <td>
                          {entry.status === 'Pending' ? (
                            rejectingEntryId === entry.entryId ? (
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <input
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  placeholder="Reject reason (optional)"
                                  className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-error w-full"
                                />
                                <div className="flex gap-1.5">
                                  <button disabled={isActing} onClick={() => handleRejectEntry(entry.entryId)}
                                    className="gs-btn gs-btn-danger gs-btn-sm flex-1 flex items-center justify-center gap-1">
                                    {isActing && entryAction?.type === 'Rejected'
                                      ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                                      : <XCircle className="w-3 h-3" />}
                                    Confirm
                                  </button>
                                  <button onClick={() => { setRejectingEntryId(null); setRejectReason('') }}
                                    className="gs-btn gs-btn-ghost gs-btn-sm">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button disabled={isActing} onClick={() => handleApproveEntry(entry.entryId)}
                                  className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5">
                                  {isActing && entryAction?.type === 'Approved'
                                    ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                                    : <CheckCircle className="w-3.5 h-3.5" />}
                                  Approve
                                </button>
                                <button disabled={isActing} onClick={() => setRejectingEntryId(entry.entryId)}
                                  className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-on-surface-variant">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {isRegClosed && (
              <p className="text-center text-xs text-on-surface-variant py-3 border-t border-outline-variant/30">
                Odds calculated based on historical win rates. Locked at {fmtDate(regInfo.registrationCloseAt)}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Race modal — rendered outside both views so it works from entries view too */}
      {showModal && (
        <RaceModal
          race={editingRace}
          tournaments={tournaments}
          users={users}
          allRaces={raceDetails}
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
