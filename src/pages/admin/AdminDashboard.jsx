import { useCallback, useEffect, useState } from 'react'
import { approveUser, getPendingUsers, rejectUser } from '../../api/admin'
import DashboardLayout from '../../components/layout/DashboardLayout'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getPendingUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách chờ duyệt')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleApprove = async (userId) => {
    setActionId(userId)
    setError('')
    try {
      await approveUser(userId)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyệt tài khoản thất bại')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (userId) => {
    setActionId(userId)
    setError('')
    try {
      await rejectUser(userId, rejectReason.trim() || null)
      setRejectingId(null)
      setRejectReason('')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Từ chối tài khoản thất bại')
    } finally {
      setActionId(null)
    }
  }

  return (
    <DashboardLayout title="Bảng quản trị">
      <p className="text-sm text-on-surface-variant mb-6">
        Duyệt tài khoản Chủ ngựa và Kỵ sĩ đang chờ phê duyệt.
      </p>

      {error ? (
        <div className="mb-4 text-sm bg-error/15 border border-error/30 text-error rounded-lg p-3">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Đang tải...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Không có tài khoản nào đang chờ duyệt.</p>
      ) : (
        <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-high text-left">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Ngày đăng ký</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.userId} className="border-t border-outline-variant/20">
                  <td className="px-4 py-3">{item.fullName}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.roleName || item.roleCode}</td>
                  <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    {rejectingId === item.userId ? (
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Lý do từ chối (tuỳ chọn)"
                          className="border border-outline-variant/40 rounded px-2 py-1 text-xs bg-surface-container"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === item.userId}
                            onClick={() => handleReject(item.userId)}
                            className="px-3 py-1 text-xs rounded bg-error/20 text-error border-none cursor-pointer disabled:opacity-50"
                          >
                            Xác nhận từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null)
                              setRejectReason('')
                            }}
                            className="px-3 py-1 text-xs rounded border border-outline-variant/40 bg-transparent cursor-pointer"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionId === item.userId}
                          onClick={() => handleApprove(item.userId)}
                          className="px-3 py-1 text-xs rounded bg-primary text-on-primary border-none cursor-pointer disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={actionId === item.userId}
                          onClick={() => setRejectingId(item.userId)}
                          className="px-3 py-1 text-xs rounded bg-error/20 text-error border-none cursor-pointer disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
