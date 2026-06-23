import api from '../services/api'

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getPendingUsers() {
  const res = await api.get('/api/admin/users/pending')
  return res.data
}

export async function approveUser(userId) {
  const res = await api.post(`/api/admin/users/${userId}/approve`)
  return res.data
}

export async function rejectUser(userId, reason) {
  const res = await api.post(`/api/admin/users/${userId}/reject`, { reason: reason || null })
  return res.data
}

export async function getUsers() {
  const res = await api.get('/api/users')
  return res.data
}

// ─── Tournaments ──────────────────────────────────────────────────────────────

export async function getTournaments() {
  const res = await api.get('/api/tournaments')
  return res.data
}

export async function getTournamentDetail(id) {
  const res = await api.get(`/api/tournaments/${id}`)
  return res.data
}

export async function createTournament(payload) {
  const res = await api.post('/api/tournaments', payload)
  return res.data
}

export async function updateTournament(id, payload) {
  const res = await api.put(`/api/tournaments/${id}`, payload)
  return res.data
}

export async function deleteTournament(id) {
  const res = await api.delete(`/api/tournaments/${id}`)
  return res.data
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function getRaces() {
  const res = await api.get('/api/races')
  return res.data
}

export async function getRaceDetail(id) {
  const res = await api.get(`/api/races/${id}`)
  return res.data
}

export async function createRace(payload) {
  const res = await api.post('/api/races', payload)
  return res.data
}

export async function updateRace(id, payload) {
  const res = await api.put(`/api/races/${id}`, payload)
  return res.data
}

export async function deleteRace(id) {
  const res = await api.delete(`/api/races/${id}`)
  return res.data
}


//===Discrepancies======
//lay danh sach discrepancies voi filter
export async function getDiscrepancies( { 
  page = 1, 
  pageSize = 10,
  search = "", 
  status = "",
  sort = 'createdAt',
  order = 'desc' } = {}) {
    const res = await api.get('/api/admin/discrepancies', { params: { page, pageSize, search, status, sort, order } })
    return res.data
}
// cap nhat status discrepancy tu pending thanh resolved or dismissed
export async function resolveDiscrepancy(id, {
  resolution, notes }) {
    const res = await api.post(`/api/admin/discrepancies/${id}/resolve`, { resolution, notes })
    return res.data
  }

//delete discrepancy
export async function deleteDiscrepancy(id) {
    const res = await api.delete(`/api/admin/discrepancies/${id}`)
    return res.data
}

//get discrepancy detail
export async function getDiscrepancyDetail(id) {
    const res = await api.get(`/api/admin/discrepancies/${id}`)
    return res.data
  }




//======= VIOLATIONS ======
//lay danh sach violations voi filter
export async function getViolations( { 
  page = 1, 
  pageSize = 10,
  search = "", 
  status = "",
  sort = 'createdAt',
  order = 'desc' } = {}) {
    const res = await api.get('/api/admin/violations', { params: { page, pageSize, search, status, sort, order } })
    return res.data
  }

  //Tao moi violation
  export async function createViolation(data) {
    const res = await api.post('/api/admin/violations', data)
    return res.data
  }

  //Cap nhat violation
  export async function updateViolation(id, data) {
    const res = await api.put(`/api/admin/violations/${id}`, data)
    return res.data
  }

  //Xoa violation
  export async function deleteViolation(id) {
    const res = await api.delete(`/api/admin/violations/${id}`)
    return res.data
  }

  //get violation detail
  export async function getViolationDetail(id) {
    const res = await api.get(`/api/admin/violations/${id}`)
    return res.data
  }

  //get violation comments
  export async function getViolationComments(id) {
    const res = await api.get(`/api/admin/violations/${id}/comments`)
    return res.data
  }





  //========= POINTS ======
  //lay danh sach points voi filter
  export async function getPoints( { 
    page = 1, 
    pageSize = 10,
    search = "", 
    status = "",
    sort = 'createdAt',
    order = 'desc' } = {}) {
    const res = await api.get('/api/admin/points', { params: { page, pageSize, search, status, sort, order } })
    return res.data
  }

  //lich su points
  export async function getPointsHistory({
    page = 1, 
    pageSize = 10,
    search = "", 
    status = "",
    sort = 'createdAt',
    order = 'desc' } = {}) {
    const res = await api.get('/api/admin/points/history', { params: { page, pageSize, search, status, sort, order } })
    return res.data
  }

  export async function getJockeyLeaderboard({
    page = 1, 
    pageSize = 10,
    search = "", 
    status = "",
    sort = 'createdAt',
    order = 'desc' } = {}) {
    const res = await api.get('/api/admin/points/jockey-leaderboard', { params: { page, pageSize, search, status, sort, order } })
    return res.data
  }

export async function adjustPoints(targetType, targetId, points, reason) {
  const res = await api.post('/api/admin/points/adjust', { targetType, targetId, points, reason })
  return res.data
}

  //get point detail