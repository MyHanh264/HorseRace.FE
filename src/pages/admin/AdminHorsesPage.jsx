import { useCallback, useEffect, useState } from 'react'
import {
  approveHorse,
  getHorsesForAdmin,
  rejectHorse,
  revokeHorse,
} from '../../api/admin'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import AdminNav from '../../components/AdminNav'
import { PawPrint, CheckCircle, XCircle, Ban, Clock } from 'lucide-react'

const STATUS_TABS = [
  { label: 'Chờ duyệt', value: 'Pending' },
  { label: 'Đã duyệt', value: 'Approved' },
  { label: 'Từ chối', value: 'Rejected' },
  { label: 'Thu hồi', value: 'Revoked' },
  { label: 'Tất cả', value: '' },
]

const STATUS_BADGE = {
  Pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Rejected: 'bg-error/10 text-error border border-error/20',
  Revoked: 'bg-on-surface-variant/10 text-on-surface-variant border border-outline-variant/40',
}

function badgeClass(status) {
  return `inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    STATUS_BADGE[status] || STATUS_BADGE.Revoked
  }`
}

export default function AdminHorsesPage() {
  const [horses, setHorses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStatus, setActiveStatus] = useState('Pending')
  const [actionId, setActionId] = useState(null)
  // Inline reason editor: { id, mode: 'reject' | 'revoke' }
  const [reasonFor, setReasonFor] = useState(null)
  const [reasonText, setReasonText] = useState('')

  const loadHorses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getHorsesForAdmin(activeStatus)
      setHorses(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách ngựa')
    } finally {
      setLoading(false)
    }
  }, [activeStatus])

  useEffect(() => {
    loadHorses()
  }, [loadHorses])

  const resetReason = () => {
    setReasonFor(null)
    setReasonText('')
  }

  const handleApprove = async (horseId) => {
    setActionId(horseId)
    setError('')
    try {
      await approveHorse(horseId)
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyệt ngựa thất bại')
    } finally {
      setActionId(null)
    }
  }

  const handleConfirmReason = async () => {
    if (!reasonFor) return
    const { id, mode } = reasonFor
    if (mode === 'reject' && !reasonText.trim()) return
    setActionId(id)
    setError('')
    try {
      if (mode === 'reject') {
        await rejectHorse(id, reasonText.trim())
      } else {
        await revokeHorse(id, reasonText.trim() || null)
      }
      resetReason()
      await loadHorses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại')
    } finally {
      setActionId(null)
    }
  }

  const pendingCount = horses.filter((h) => h.status === 'Pending').length

  return (
    <DashboardLayout>
      <Header title="Duyệt ngựa" />

      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Quản lý ngựa</h1>
              <p className="text-on-surface-variant text-sm">
                Duyệt, từ chối hoặc thu hồi hồ sơ ngựa do Chủ ngựa gửi lên.
              </p>
            </div>
          </div>
          <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
        </div>

        <AdminNav />

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => {
                setActiveStatus(tab.value)
                resetReason()
              }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeStatus === tab.value
                  ? 'bg-on-surface text-surface'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.value === 'Pending' && <Clock className="w-3.5 h-3.5" />}
              {tab.label}
              {tab.value === 'Pending' && pendingCount > 0 && activeStatus === 'Pending' ? (
                <span className="ml-1 px-1.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Error */}
        {error ? (
          <div className="mb-5 auth-alert auth-alert--error flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-on-surface-variant text-sm">Đang tải danh sách...</span>
            </div>
          </div>
        ) : horses.length === 0 ? (
          <div className="gs-card p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
              <PawPrint className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-serif text-xl font-bold text-on-surface mb-2">Không có ngựa</h3>
            <p className="text-on-surface-variant text-sm">
              Không có ngựa nào ở trạng thái này.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ngựa</th>
                  <th>Giống</th>
                  <th>Năm sinh</th>
                  <th>Màu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.horseId}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-outline-variant/50 overflow-hidden flex items-center justify-center shrink-0">
                          {horse.imageUrl ? (
                            <img
                              src={horse.imageUrl}
                              alt={horse.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PawPrint className="w-4 h-4 text-on-surface-variant/50" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-on-surface">{horse.name}</div>
                          <div className="text-xs text-on-surface-variant font-mono">#{horse.horseId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-on-surface-variant">{horse.breed || '—'}</td>
                    <td className="text-on-surface-variant font-mono text-xs">{horse.birthYear || '—'}</td>
                    <td className="text-on-surface-variant">{horse.color || '—'}</td>
                    <td>
                      <span className={badgeClass(horse.status)}>{horse.status}</span>
                      {(horse.status === 'Rejected' || horse.status === 'Revoked') && horse.rejectionReason ? (
                        <p className="text-xs text-on-surface-variant/70 mt-1 max-w-[200px]">
                          {horse.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td>
                      {reasonFor?.id === horse.horseId ? (
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          <input
                            type="text"
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            placeholder={
                              reasonFor.mode === 'reject'
                                ? 'Lý do từ chối (bắt buộc)'
                                : 'Lý do thu hồi (tuỳ chọn)'
                            }
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error transition-all placeholder:text-on-surface-variant/40"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={
                                actionId === horse.horseId ||
                                (reasonFor.mode === 'reject' && !reasonText.trim())
                              }
                              onClick={handleConfirmReason}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Xác nhận
                            </button>
                            <button
                              type="button"
                              onClick={resetReason}
                              className="gs-btn gs-btn-ghost gs-btn-sm"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {horse.status === 'Pending' ? (
                            <>
                              <button
                                type="button"
                                disabled={actionId === horse.horseId}
                                onClick={() => handleApprove(horse.horseId)}
                                className="gs-btn gs-btn-primary gs-btn-sm flex items-center gap-1.5"
                              >
                                {actionId === horse.horseId ? (
                                  <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Duyệt
                              </button>
                              <button
                                type="button"
                                disabled={actionId === horse.horseId}
                                onClick={() => {
                                  setReasonFor({ id: horse.horseId, mode: 'reject' })
                                  setReasonText('')
                                }}
                                className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Từ chối
                              </button>
                            </>
                          ) : horse.status === 'Approved' ? (
                            <button
                              type="button"
                              disabled={actionId === horse.horseId}
                              onClick={() => {
                                setReasonFor({ id: horse.horseId, mode: 'revoke' })
                                setReasonText('')
                              }}
                              className="gs-btn gs-btn-danger gs-btn-sm flex items-center gap-1.5"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Thu hồi
                            </button>
                          ) : (
                            <span className="text-on-surface-variant/50 text-sm">—</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
