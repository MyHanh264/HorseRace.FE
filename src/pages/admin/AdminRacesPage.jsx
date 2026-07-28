import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Flag, Plus, ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2, X, AlertCircle,
  Users, CheckCircle, XCircle, ArrowLeft, UserCheck, Eye, Trophy, Search,
  LockOpen, Lock, RotateCcw, MoreVertical, TrendingUp,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getAllTournaments, getRaces, getRaceDetail, createRace, updateRace, deleteRace,
  getAllUser, approveEntry, rejectEntry, openRegistration, closeRegistration, startRace,
  unpublishRace, getRoleMap, getRoleCodeById, getAllViolations,
  getRaceStandings, getRaceResults,
} from '../../api/admin'
import api from '../../services/api'
import { validateOverrideReason } from '../../utils/validation'
import RaceResultsModal from '../../components/RaceResultsModal'
import OddsBoardModal from '../../components/OddsBoardModal'

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
  // Always return the {date, time} shape callers expect — returning a bare '—' string
  // here let `dt.time`/`dt.date` silently resolve to undefined (a string has no such
  // properties) instead of visibly showing a placeholder, which is how a race with a
  // missing scheduledStartTime rendered as a blank date/time instead of an obvious "—".
  if (!dt) return { date: '—', time: '—' }
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
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

// Two [start,end) windows overlap iff each starts before the other ends — touching edges are OK.
function rangesOverlap(s1, e1, s2, e2) {
  return s1 < e2 && s2 < e1
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
    scheduledEndTime:   toDatetimeLocal(race?.scheduledEndTime),
    numberOfLegs:       race?.numberOfLegs       ?? 3,
    maxHorses:          race?.maxHorses          ?? 14,
    roundType:          race?.roundType          ?? 'Regular',
    referee1Id:         race?.referee1Id         ?? '',
    referee2Id:         race?.referee2Id         ?? '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = k => e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))
  const refereeUsers = users.filter(u => (u.roleCode || getRoleCodeById(u.roleId)) === 'REFEREE')

  const handleSubmit = e => {
    e.preventDefault()
    if (form.referee1Id && form.referee2Id && form.referee1Id === form.referee2Id) {
      return
    }
    if (dateOutOfRange || endBeforeStart || startInPast || tournamentOverlap || refereeConflict) {
      return
    }
    onSubmit({
      tournamentId:       Number(form.tournamentId),
      name:               form.name.trim(),
      scheduledStartTime: new Date(form.scheduledStartTime).toISOString(),
      scheduledEndTime:   new Date(form.scheduledEndTime).toISOString(),
      numberOfLegs:       Number(form.numberOfLegs),
      maxHorses:          Number(form.maxHorses),
      roundType:          form.roundType,
      referee1Id:         Number(form.referee1Id) || 0,
      referee2Id:         Number(form.referee2Id) || 0,
    })
  }

  const selectedTournament = tournaments.find(t => String(t.tournamentId) === String(form.tournamentId))

  // Ngày Race phải nằm trong khoảng ngày của Tournament — không được sớm hơn hôm nay
  // lẫn không được ngoài [Tournament.startDate, Tournament.endDate].
  const todayStr = new Date().toISOString().split('T')[0]
  const minDate = selectedTournament?.startDate
    ? (selectedTournament.startDate > todayStr ? selectedTournament.startDate : todayStr)
    : todayStr
  const maxDate = selectedTournament?.endDate

  const dateOutOfRange = !!(
    selectedTournament &&
    form.scheduledStartTime &&
    (() => {
      const d = form.scheduledStartTime.split('T')[0]
      return d < minDate || (maxDate && d > maxDate)
    })()
  )

  const refereeMismatch = form.referee1Id && form.referee2Id && form.referee1Id === form.referee2Id

  const endBeforeStart = !!(
    form.scheduledStartTime && form.scheduledEndTime &&
    new Date(form.scheduledEndTime) <= new Date(form.scheduledStartTime)
  )

  // Only meaningful for Create — editing a race that's already Scheduled but whose
  // original slot has since slipped into the past shouldn't be force-blocked from
  // otherwise-valid edits (e.g. just fixing the referee).
  const startInPast = !isEdit && !!(
    form.scheduledStartTime && new Date(form.scheduledStartTime) < new Date()
  )

  // Same tournament, overlapping time slot — BE hard-blocks this, so pre-check for immediate feedback.
  const tournamentOverlap = useMemo(() => {
    if (!form.scheduledStartTime || !form.scheduledEndTime) return null
    const s = new Date(form.scheduledStartTime)
    const e = new Date(form.scheduledEndTime)
    if (e <= s) return null
    const currentTourId = Number(form.tournamentId)
    return allRaces.find(r => {
      if (r.raceId === race?.raceId)   return false
      if (r.status === 'Cancelled')    return false
      if (r.tournamentId !== currentTourId) return false
      if (!r.scheduledStartTime || !r.scheduledEndTime) return false
      return rangesOverlap(s, e, new Date(r.scheduledStartTime), new Date(r.scheduledEndTime))
    }) ?? null
  }, [form.scheduledStartTime, form.scheduledEndTime, form.tournamentId, allRaces, race])

  // Same referee double-booked on an overlapping time slot in a different tournament — also hard-blocked by BE.
  const refereeConflict = useMemo(() => {
    if (!form.scheduledStartTime || !form.scheduledEndTime || (!form.referee1Id && !form.referee2Id)) return null
    const s = new Date(form.scheduledStartTime)
    const e = new Date(form.scheduledEndTime)
    if (e <= s) return null
    const currentTourId = Number(form.tournamentId)
    const ref1 = String(form.referee1Id)
    const ref2 = String(form.referee2Id)
    return allRaces.find(r => {
      if (r.tournamentId === currentTourId) return false
      if (r.raceId === race?.raceId)        return false
      if (r.status === 'Cancelled')         return false
      if (!r.scheduledStartTime || !r.scheduledEndTime) return false
      if (!rangesOverlap(s, e, new Date(r.scheduledStartTime), new Date(r.scheduledEndTime))) return false
      return (
        (ref1 && (String(r.referee1Id) === ref1 || String(r.referee2Id) === ref1)) ||
        (ref2 && (String(r.referee1Id) === ref2 || String(r.referee2Id) === ref2))
      )
    }) ?? null
  }, [form.scheduledStartTime, form.scheduledEndTime, form.referee1Id, form.referee2Id, form.tournamentId, allRaces, race])

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
              <AlertCircle className="w-4 h-4 shrink-0" />Referee 1 and Referee 2 must be different
            </div>
          )}
          {tournamentOverlap && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This time slot overlaps race <strong>"{tournamentOverlap.name}"</strong> in the same tournament. Two races in the same tournament cannot run at the same time.
              </span>
            </div>
          )}
          {!tournamentOverlap && refereeConflict && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                An assigned referee is already officiating race <strong>"{refereeConflict.name}"</strong> during this time slot (in a different tournament).
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

          {/* Race date — shared by start & end time */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Race Date <span className="text-error">*</span>
            </label>
            <input
              required
              type="date"
              value={(form.scheduledStartTime?.split('T')[0] || form.scheduledEndTime?.split('T')[0]) || ''}
              min={minDate}
              max={maxDate}
              onChange={e => {
                const newDate = e.target.value
                setForm(f => ({
                  ...f,
                  scheduledStartTime: `${newDate}T${f.scheduledStartTime?.split('T')[1] ?? '08:00'}`,
                  scheduledEndTime:   `${newDate}T${f.scheduledEndTime?.split('T')[1]   ?? '09:00'}`,
                }))
              }}
              className={inputCls}
            />
            {selectedTournament ? (
              <p className={`text-xs mt-1.5 ${dateOutOfRange ? 'text-error' : 'text-on-surface-variant'}`}>
                {dateOutOfRange
                  ? `Must be within the tournament's schedule: ${minDate} – ${maxDate ?? 'no end date'}`
                  : `Tournament runs ${selectedTournament.startDate} – ${selectedTournament.endDate}`}
              </p>
            ) : (
              <p className="text-xs mt-1.5 text-on-surface-variant">
                Select a tournament first to see its valid date range.
              </p>
            )}
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Start Time <span className="text-error">*</span>
              </label>
              <input
                required
                type="time"
                value={form.scheduledStartTime?.split('T')[1]?.slice(0, 5) ?? ''}
                onChange={e => {
                  // "" (date not picked yet) is not nullish, so `??` alone won't fall
                  // through to the other field/today — use `||` first to treat it the
                  // same as missing. Without this the saved value ends up "T10:00"
                  // (no date at all) whenever Start/End Time is touched before Date.
                  const date = (form.scheduledStartTime?.split('T')[0] || form.scheduledEndTime?.split('T')[0]) || todayStr;
                  setForm(f => ({ ...f, scheduledStartTime: `${date}T${e.target.value}` }));
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                End Time <span className="text-error">*</span>
              </label>
              <input
                required
                type="time"
                value={form.scheduledEndTime?.split('T')[1]?.slice(0, 5) ?? ''}
                onChange={e => {
                  const date = (form.scheduledEndTime?.split('T')[0] || form.scheduledStartTime?.split('T')[0]) || todayStr;
                  setForm(f => ({ ...f, scheduledEndTime: `${date}T${e.target.value}` }));
                }}
                className={inputCls}
              />
            </div>
          </div>
          {endBeforeStart && (
            <p className="text-xs text-error -mt-2">End time must be after start time.</p>
          )}
          {startInPast && !endBeforeStart && (
            <p className="text-xs text-error -mt-2">Start time is already in the past — pick a time later than now.</p>
          )}

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
                {refereeUsers.map(u => (
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
                {refereeUsers.filter(u => String(u.userId) !== String(form.referee1Id)).map(u => (
                  <option key={u.userId} value={u.userId}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
          {refereeUsers.length === 0 && (
            <p className="text-xs text-error -mt-2">No referee accounts found. Create a REFEREE account first.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting || refereeMismatch || dateOutOfRange || endBeforeStart || startInPast || !!tournamentOverlap || !!refereeConflict}
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

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
// Soft-delete — BE handles the IsDeleted flag internally.
// No reason required since this is reversible (admin can ask BE to restore).

function DeleteConfirmModal({ race, entryCount, onClose, onConfirm, submitting, error }) {
  const CAN_DELETE_STATUSES = ['Scheduled', 'Cancelled', 'Finished']
  const canDelete = CAN_DELETE_STATUSES.includes(race.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="gs-card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Delete Race</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Race info */}
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-4 py-3 space-y-1.5">
            <p className="text-sm font-semibold text-on-surface">{race.name}</p>
            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <span className="font-mono">{fmtRaceId(race.raceId)}</span>
              <span>·</span>
              <span>Status: <span className="text-on-surface">{race.status}</span></span>
              <span>·</span>
              <span>{entryCount} entr{entryCount === 1 ? 'y' : 'ies'}</span>
            </div>
          </div>

          {!canDelete ? (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Cannot delete a race that is <strong>In Progress</strong> or <strong>Paused</strong>.
                Please cancel or finish the race first.
              </span>
            </div>
          ) : entryCount > 0 ? (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This race has <strong>{entryCount} entr{entryCount === 1 ? 'y' : 'ies'}</strong>.
                Please remove all entries before deleting.
              </span>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Are you sure you want to delete this race? This is a{' '}
              <strong className="text-amber-400">soft delete</strong> — the race
              will be hidden but can be restored if needed.
            </p>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={submitting || !canDelete || entryCount > 0}
              className="gs-btn gs-btn-danger flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting && <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />}
              Delete Race
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Unpublish Confirm Modal ───────────────────────────────────────────────────
// Requires a reason so unpublishing a race is a deliberate, explainable action rather
// than a silent one-click toggle — closes the transparency gap around Publish/Unpublish.

function UnpublishConfirmModal({ race, onClose, onConfirm, submitting, error }) {
  const [reason, setReason] = useState('')
  const validation = validateOverrideReason(reason)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="gs-card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-error" />
            </div>
            <h2 className="font-serif font-bold text-on-surface">Unpublish Race</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface-variant">
            This reverses payouts, Prize Points, and career stats for{' '}
            <strong className="text-on-surface">"{race.name}"</strong>, and returns it to
            Pending Result for correction. This action is logged.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Reason <span className="text-error">*</span>
            </label>
            <textarea
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this race being unpublished? (e.g. Missed approving a violation report before publishing)"
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
            {reason && !validation.valid && (
              <p className="text-xs text-error mt-1.5">{validation.error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="gs-btn gs-btn-ghost">Cancel</button>
            <button
              onClick={() => onConfirm(reason.trim())}
              disabled={submitting || !validation.valid}
              className="gs-btn gs-btn-danger flex items-center gap-2">
              {submitting && <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />}
              Unpublish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRacesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Data ──
  const [tournaments, setTournaments] = useState([])
  const [raceDetails, setRaceDetails] = useState([])   // full detail of all races
  const [entries, setEntries]         = useState([])   // all entries
  const [users, setUsers]             = useState([])   // for referee name lookup
  const [pendingViolations, setPendingViolations] = useState([])   // unresolved violation reports — gates Publish

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // ── Filters ── (reads ?tournamentId= from URL — navigated here from Tournament Management)
  const [selectedTournamentId, setSelectedTournamentId] = useState(() => searchParams.get('tournamentId') || '')
  const [raceSearch, setRaceSearch] = useState('')
  const [raceStatusFilter, setRaceStatusFilter] = useState('')

  // ── Pagination (races table) ──
  const [racesPage, setRacesPage] = useState(1)
  const RACES_PAGE_SIZE = 10

  // ── View: 'races' | 'entries' ──
  const [view, setView]         = useState('races')
  const [activeRace, setActiveRace] = useState(null)

  // ── Modal ──
  const [showModal, setShowModal]   = useState(false)
  const [editingRace, setEditingRace] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // race object for the modal
  const [deleteError, setDeleteError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [openMenuPos, setOpenMenuPos] = useState(null) // { top, right } viewport-fixed coords — rendered via portal so the menu escapes the table's overflow-x-auto clipping (last row's dropdown was getting cut off)
  const menuButtonRef = useRef(null)  // current ⋮ button (so a second click on it can toggle-closed)
  const menuPopupRef  = useRef(null)  // current dropdown panel (so clicks inside it don't close it)
  const [unpublishTarget, setUnpublishTarget] = useState(null)
  const [unpublishError, setUnpublishError] = useState('')
  const [resultsRace, setResultsRace] = useState(null) // race object shown in RaceResultsModal

  // ── Entry approve/reject ──
  const [entryAction, setEntryAction]   = useState(null) // { id, type }
  const [entryError, setEntryError]     = useState('')
  const [rejectingEntryId, setRejectingEntryId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Registration open/close ──
  const [regLoading, setRegLoading] = useState(null) // raceId currently being processed
  // raceId → { registrationOpenAt, registrationCloseAt } from the list endpoint (detail endpoint is missing these 2 fields)
  const [raceRegMap, setRaceRegMap] = useState({})
  // Race đang mở bảng odds (Flow 3+7) — chỉ để xem.
  const [oddsRace, setOddsRace] = useState(null)

  const buildRegMap = (raceList) => {
    const map = {}
    raceList.forEach(r => {
      map[r.raceId] = {
        registrationOpenAt:  r.registrationOpenAt  ?? null,
        registrationCloseAt: r.registrationCloseAt ?? null,
        // Flow 7: đóng đăng ký = sinh odds = MỞ CƯỢC luôn, và cũng là điều kiện duy nhất để
        // Start Race. Cược tự đóng khi race xuất phát — không có bước bấm tay nào.
        oddsComputedAt:      r.oddsComputedAt      ?? null,
      }
    })
    return map
  }

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [tournamentsData, racesBasic, entriesData, usersData, , violationsData] = await Promise.all([
        getAllTournaments(),
        getRaces(),
        api.get('/api/entries').then(r => r.data),
        getAllUser({ page: 1, pageSize: 1000 }),
        getRoleMap(),
        getAllViolations({ status: 'Pending', pageSize: 200 }),
      ])

      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      setUsers(Array.isArray(usersData?.items ?? usersData) ? (usersData?.items ?? usersData) : [])
      setPendingViolations(Array.isArray(violationsData?.items) ? violationsData.items : [])
      setError('')

      const raceList = Array.isArray(racesBasic) ? racesBasic : []
      setRaceRegMap(buildRegMap(raceList))

      // getRaces() (the list) is missing scheduledStartTime for a freshly created race
      // for reasons not yet understood, so this still fetches per-race detail — but uses
      // allSettled instead of all: one race's detail request failing (transient 500 on a
      // free-tier host, 20+ requests firing at once) no longer rejects the whole batch and
      // blanks the entire page. That race is just skipped instead.
      if (raceList.length > 0) {
        const results = await Promise.allSettled(raceList.map(r => getRaceDetail(r.raceId)))
        setRaceDetails(results.filter(r => r.status === 'fulfilled').map(r => r.value).filter(Boolean))
      } else {
        setRaceDetails([])
      }
    } catch (err) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      getAllTournaments(),
      getRaces(),
      api.get('/api/entries').then(r => r.data),
      getAllUser({ page: 1, pageSize: 1000 }),
      getRoleMap(),
      getAllViolations({ status: 'Pending', pageSize: 200 }),
    ])
      .then(([tournamentsData, racesBasic, entriesData, usersData, , violationsData]) => {
        const userList = usersData?.items ?? usersData
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
        setEntries(Array.isArray(entriesData) ? entriesData : [])
        setUsers(Array.isArray(userList) ? userList : [])
        setPendingViolations(Array.isArray(violationsData?.items) ? violationsData.items : [])
        const raceList = Array.isArray(racesBasic) ? racesBasic : []
        setRaceRegMap(buildRegMap(raceList))
        // Same reasoning as loadAll() above — allSettled so one bad race doesn't blank the page.
        if (raceList.length > 0) {
          return Promise.allSettled(raceList.map(r => getRaceDetail(r.raceId)))
            .then(results => setRaceDetails(
              results.filter(r => r.status === 'fulfilled').map(r => r.value).filter(Boolean)
            ))
        }
        setRaceDetails([])
      })
      .catch(err => setError(err?.message || 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!openMenuId) return

    const close = () => {
      setOpenMenuId(null)
    }

    // Use mousedown so this fires BEFORE the trigger button's onClick, and check
    // the target against the menu refs so clicks inside the menu (or on the trigger)
    // don't immediately re-close it.
    const handleDocMouseDown = (e) => {
      const target = e.target
      if (menuButtonRef.current?.contains(target)) return
      if (menuPopupRef.current?.contains(target))  return
      close()
    }
    const handleScroll = () => close()

    document.addEventListener('mousedown', handleDocMouseDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      document.removeEventListener('mousedown', handleDocMouseDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [openMenuId])

  // ── Derived data ──────────────────────────────────────────────────────────
  const userMap       = useMemo(() => Object.fromEntries(users.map(u => [u.userId, u])),             [users])
  const tournamentMap = useMemo(() => Object.fromEntries(tournaments.map(t => [t.tournamentId, t.name])), [tournaments])
  // raceId → count of unresolved (Pending) violation reports — gates the Publish action below.
  const pendingViolationCountByRace = useMemo(() => {
    const counts = {}
    pendingViolations.forEach(v => { counts[v.raceId] = (counts[v.raceId] ?? 0) + 1 })
    return counts
  }, [pendingViolations])

  const filteredRaces = useMemo(() => {
    const q = raceSearch.trim().toLowerCase()
    return raceDetails.filter(r => {
      if (selectedTournamentId && String(r.tournamentId) !== String(selectedTournamentId)) return false
      if (raceStatusFilter && r.status !== raceStatusFilter) return false
      if (q && !(r.name?.toLowerCase().includes(q) || String(r.raceId).includes(q))) return false
      return true
    })
  }, [raceDetails, selectedTournamentId, raceStatusFilter, raceSearch])

  // Page reset lives in each filter's own onChange (below) rather than an effect —
  // it's a direct response to a user action, not a sync with an external system.
  const handleRaceSearchChange = (value) => { setRaceSearch(value); setRacesPage(1) }
  const handleRaceStatusFilterChange = (value) => { setRaceStatusFilter(value); setRacesPage(1) }
  const handleTournamentFilterChange = (value) => { setSelectedTournamentId(value); setRacesPage(1) }

  const racesTotalPages = Math.max(1, Math.ceil(filteredRaces.length / RACES_PAGE_SIZE))
  const racesPageSafe = Math.min(racesPage, racesTotalPages)
  const paginatedRaces = filteredRaces.slice(
    (racesPageSafe - 1) * RACES_PAGE_SIZE,
    racesPageSafe * RACES_PAGE_SIZE,
  )

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.raceId)
    setDeleteError('')
    try {
      await deleteRace(deleteTarget.raceId)
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message

      let friendly = detail
      if (status === 409) {
        // Check if race has entries for a more specific message
        const raceEntryCount = entries.filter(e => e.raceId === deleteTarget.raceId).length
        friendly = raceEntryCount > 0
          ? `This race has ${raceEntryCount} entry/entries. Remove all entries before deleting.`
          : `Cannot delete this race (${detail}). It may have related data that prevents deletion.`
      }
      setDeleteError(friendly)
    } finally {
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
      setFormError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to save race')
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
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to open registration')
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
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to close registration')
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
      setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to start race')
    } finally {
      setRegLoading(null)
    }
  }

  const handleUnpublishRace = async (raceId, reason) => {
    setRegLoading(raceId)
    setUnpublishError('')
    try {
      await unpublishRace(raceId, reason)
      setUnpublishTarget(null)
      await loadAll()
    } catch (err) {
      setUnpublishError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to unpublish race')
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
      setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to approve entry')
    } finally {
      setEntryAction(null)
    }
  }

  const handleRejectEntry = async (entryId) => {
    setEntryAction({ id: entryId, type: 'Rejected' })
    setEntryError('')
    try {
      await rejectEntry(entryId, rejectReason.trim())
      setRejectingEntryId(null)
      setRejectReason('')
      await loadAll()
    } catch (err) {
      setEntryError(err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to reject entry')
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

          <button onClick={openCreate} className="gs-btn gs-btn-primary flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Create Race
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-error/10 border border-error/25 text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Flag}        iconCls="bg-primary/10 border border-primary/20 text-primary"       label="Active Races"       value={statsRaces.active} />
          <StatCard icon={Users}       iconCls="bg-secondary/10 border border-secondary/20 text-secondary" label="Total Entries"       value={statsRaces.totalEntries} />
          <StatCard icon={UserCheck}   iconCls="bg-blue-400/10 border border-blue-400/20 text-blue-400"    label="Referees Assigned"  value={`${statsRaces.withRefs}/${statsRaces.total}`} />
          <StatCard icon={AlertCircle} iconCls="bg-error/10 border border-error/20 text-error"             label="Pending Ref. Assign" value={statsRaces.noRefs} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={raceSearch}
              onChange={e => handleRaceSearchChange(e.target.value)}
              placeholder="Search race name or #ID..."
              className="bg-surface-container-low border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-secondary transition-all w-[220px]"
            />
          </div>
          <div className="relative">
            <select
              value={raceStatusFilter}
              onChange={e => handleRaceStatusFilterChange(e.target.value)}
              className="appearance-none bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-9 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all cursor-pointer min-w-[160px]"
            >
              <option value="">All Statuses</option>
              {Object.entries(RACE_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={selectedTournamentId}
              onChange={e => handleTournamentFilterChange(e.target.value)}
              className="appearance-none bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-9 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary transition-all cursor-pointer min-w-[200px]"
            >
              <option value="">All Tournaments</option>
              {tournaments.map(t => (
                <option key={t.tournamentId} value={t.tournamentId}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
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
                  {paginatedRaces.map((race, i) => {
                    const dt = fmtDateTime(race.scheduledStartTime)
                    const raceEntryList = entries.filter(e => e.raceId === race.raceId)
                    const approvedEntryCount = raceEntryList.filter(e => e.status === 'Approved').length
                    const meta = RACE_STATUS_META[race.status] ?? { label: race.status, cls: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/50' }
                    const ref1 = race.referee1Id ? userMap[race.referee1Id] : null
                    const ref2 = race.referee2Id ? userMap[race.referee2Id] : null

                    return (
                      <tr
                        key={race.raceId}
                        onClick={() => openEntriesView(race)}
                        className={`animate-fade-in-up delay-row-${(i % 4)+1} cursor-pointer hover:bg-surface-container/60 ${openMenuId === race.raceId ? 'relative z-50' : ''}`}
                        style={{ opacity: 0, animationFillMode: 'forwards' }}
                      >

                        {/* Name — fixed min-width so this column doesn't get squeezed word-by-word
                            when other columns (Referees, Actions) need more room; table-layout is
                            auto, so without this the browser shrinks whichever column wraps easiest. */}
                        <td className="min-w-[220px]">
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
                        <td className="min-w-[130px] whitespace-nowrap">
                          <div className="text-sm text-on-surface">{dt.date}</div>
                          <div className="text-xs text-on-surface-variant">
                            {dt.time}{race.scheduledEndTime ? ` – ${fmtDateTime(race.scheduledEndTime).time}` : ''}
                          </div>
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
                            <button onClick={e => { e.stopPropagation(); openEdit(race) }}
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
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {/* Primary lifecycle button */}
                            {race.status === 'Scheduled' && !raceRegMap[race.raceId]?.registrationOpenAt && (
                              <button onClick={() => handleOpenRegistration(race.raceId)} disabled={regLoading === race.raceId}
                                className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1">
                                {regLoading === race.raceId ? <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> : <LockOpen className="w-3.5 h-3.5" />}
                                Open Reg
                              </button>
                            )}
                            {race.status === 'Scheduled' && raceRegMap[race.raceId]?.registrationOpenAt && !raceRegMap[race.raceId]?.registrationCloseAt && (
                              <button onClick={() => handleCloseRegistration(race.raceId)}
                                disabled={regLoading === race.raceId || approvedEntryCount < 2}
                                title={approvedEntryCount < 2 ? `Needs at least 2 approved entries to close registration (currently ${approvedEntryCount}).` : ''}
                                className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                                {regLoading === race.raceId ? <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                Close Reg
                              </button>
                            )}
                            {/* Monitor (live) and Leg history (Finished) both just navigate to the same
                                Race Execution page — unified into one "View" label/style so the row
                                doesn't carry two differently-worded buttons for the same action. */}
                            {(race.status === 'InProgress' || race.status === 'Paused' || race.status === 'PendingResult' || race.status === 'Finished') && (
                              <button onClick={e => { e.stopPropagation(); navigate(`/admin/race-execution?raceId=${race.raceId}`) }}
                                className="gs-btn gs-btn-outline-gold gs-btn-sm gs-btn-compact flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                            {(pendingViolationCountByRace[race.raceId] ?? 0) > 0 && race.status === 'PendingResult' && (
                              <button onClick={e => { e.stopPropagation(); navigate(`/admin/violations?raceId=${race.raceId}`) }}
                                className="gs-btn gs-btn-ghost gs-btn-sm gs-btn-compact flex items-center gap-1 text-amber-400">
                                <AlertCircle className="w-3.5 h-3.5" /> {pendingViolationCountByRace[race.raceId]} Pending
                              </button>
                            )}
                            {/* Full Results / Unpublish for Finished races live in the ⋮ menu below,
                                not inline — a Finished row would otherwise carry 3-4 buttons while
                                every other status only ever shows 1. */}

                            {/* ⋮ overflow menu — dropdown renders relative to this <td>; the parent <tr>
                                gets z-50 while its menu is open so it stacks above neighbouring rows
                                (Unpublish buttons etc.) without expanding the table layout. */}
                            <div className="relative">
                              <button
                                ref={openMenuId === race.raceId ? menuButtonRef : null}
                                onClick={e => {
                                  e.stopPropagation()
                                  if (openMenuId === race.raceId) {
                                    setOpenMenuId(null)
                                    return
                                  }
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setOpenMenuPos({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  })
                                  setOpenMenuId(race.raceId)
                                }}
                                className="w-8 h-8 rounded-lg border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === race.raceId && openMenuPos && createPortal(
                                <div
                                  ref={menuPopupRef}
                                  onClick={e => e.stopPropagation()}
                                  onMouseDown={e => e.stopPropagation()}
                                  style={{ top: openMenuPos.top, right: openMenuPos.right }}
                                  className="fixed bg-surface-container border border-outline-variant/40 rounded-xl shadow-2xl min-w-[160px] py-1 overflow-hidden z-[999]"
                                >
                                  {race.status === 'Finished' && (
                                    <>
                                      <button
                                        onClick={() => { setResultsRace(race); setOpenMenuId(null) }}
                                        className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-surface-container-high flex items-center gap-2 transition-colors"
                                      >
                                        <Trophy className="w-3.5 h-3.5" /> Full Results
                                      </button>
                                      <button
                                        onClick={() => { setUnpublishError(''); setUnpublishTarget(race); setOpenMenuId(null) }}
                                        className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high flex items-center gap-2 transition-colors"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" /> Unpublish
                                      </button>
                                      <div className="border-t border-outline-variant/30 my-1" />
                                    </>
                                  )}
                                  <button
                                    onClick={() => { openEdit(race); setOpenMenuId(null) }}
                                    className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <div className="border-t border-outline-variant/30 my-1" />
                                  <button
                                    onClick={() => { setDeleteTarget(race); setOpenMenuId(null) }}
                                    className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>,
                                document.body,
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && racesTotalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/40">
              <p className="text-xs text-on-surface-variant">
                Showing {(racesPageSafe - 1) * RACES_PAGE_SIZE + 1}–{Math.min(racesPageSafe * RACES_PAGE_SIZE, filteredRaces.length)} of {filteredRaces.length} races
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setRacesPage(p => Math.max(1, p - 1))} disabled={racesPageSafe === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                <span className="text-xs text-on-surface font-mono px-2">
                  {racesPageSafe} / {racesTotalPages}
                </span>
                <button onClick={() => setRacesPage(p => Math.min(racesTotalPages, p + 1))} disabled={racesPageSafe === racesTotalPages}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all">
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                </button>
              </div>
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

      {deleteTarget && (
        <DeleteConfirmModal
          race={deleteTarget}
          entryCount={entries.filter(e => e.raceId === deleteTarget.raceId).length}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          submitting={deletingId === deleteTarget.raceId}
          error={deleteError}
        />
      )}

      {unpublishTarget && (
        <UnpublishConfirmModal
          race={unpublishTarget}
          onClose={() => setUnpublishTarget(null)}
          onConfirm={reason => handleUnpublishRace(unpublishTarget.raceId, reason)}
          submitting={regLoading === unpublishTarget.raceId}
          error={unpublishError}
        />
      )}

      {resultsRace && (
        <RaceResultsModal
          raceId={resultsRace.raceId}
          raceName={resultsRace.name}
          onClose={() => setResultsRace(null)}
          fetchStandings={getRaceStandings}
          fetchResults={getRaceResults}
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

  const approvedActiveCount = raceEntries.filter(e => e.status === 'Approved').length
  const minOdds = Math.min(...raceEntries.filter(e => e.odds).map(e => e.odds))
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

      {/* Closed banner — đóng đăng ký là sinh odds và mở cược luôn. */}
      {isRegClosed && (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3 mb-5 text-amber-400 text-sm font-semibold">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Registration Closed · Odds locked in — betting is open until the race starts</span>
          <button
            onClick={() => setOddsRace(activeRace)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all"
          >
            <TrendingUp size={12} /> View Odds
          </button>
        </div>
      )}

      {oddsRace && (
        <OddsBoardModal
          raceId={oddsRace.raceId}
          raceName={oddsRace.name}
          onClose={() => setOddsRace(null)}
        />
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
                disabled={regLoading === activeRace?.raceId || approvedActiveCount < 2}
                title={approvedActiveCount < 2 ? `Needs at least 2 approved entries to close registration (currently ${approvedActiveCount}).` : ''}
                className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {regLoading === activeRace?.raceId
                  ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                  : <Lock className="w-4 h-4" />}
                Close Registration
              </button>
            )}
            {isRegOpen && approvedActiveCount < 2 && (
              <p className="text-xs text-on-surface-variant self-center">
                Needs ≥2 approved entries ({approvedActiveCount} now)
              </p>
            )}
            {/* Đóng đăng ký là điều kiện DUY NHẤT BE ép trước khi start (Flow 7) — disable kèm
                lý do thay vì để Admin bấm rồi nhận 400. */}
            {isRegClosed && activeRace?.status === 'Scheduled' && (
              <button
                onClick={() => handleStartRace(activeRace.raceId)}
                disabled={regLoading === activeRace?.raceId || !regInfo.oddsComputedAt}
                title={regInfo.oddsComputedAt ? '' : 'Close registration first'}
                className="gs-btn gs-btn-secondary flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  {/* MỘT cột odds — cùng con số cho mọi role, khóa vào lệnh cược. */}
                  <th>
                    <span className={`flex flex-col leading-tight ${isRegClosed ? 'text-amber-400' : ''}`}>Odds<span className="text-[10px] font-normal text-on-surface-variant normal-case tracking-normal">{isRegClosed ? '(spectators bet this)' : '(calculated on close)'}</span></span>
                  </th>
                  <th>Status</th>
                  {!isRegClosed && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {raceEntries.map((entry, i) => {
                  const meta     = ENTRY_STATUS_META[entry.status] ?? ENTRY_STATUS_META.Pending
                  const isActing = entryAction?.id === entry.entryId
                  const isFav    = isRegClosed && entry.odds && entry.odds === minOdds
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

                      {/* Odds — một con số, spectator cược đúng số này */}
                      <td>
                        {isRegClosed && entry.odds
                          ? <span className="flex items-center gap-1.5">
                              <span className="font-bold text-secondary font-mono">{Number(entry.odds).toFixed(2)}</span>
                              {isFav && <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-semibold">Fav</span>}
                            </span>
                          : <span className="text-on-surface-variant">—</span>}
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
                                  placeholder="Reject reason (required) *"
                                  className="text-xs bg-surface-container-lowest border border-outline-variant/40 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-error w-full"
                                />
                                <div className="flex gap-1.5">
                                  <button disabled={isActing || !rejectReason.trim()} onClick={() => handleRejectEntry(entry.entryId)}
                                    className="gs-btn gs-btn-danger gs-btn-sm flex-1 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
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
                Odds calculated from historical win rates at {fmtDate(regInfo.registrationCloseAt)} and
                fixed for the rest of the race. Spectators bet against exactly these numbers.
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
