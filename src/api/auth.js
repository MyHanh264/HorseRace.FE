function getErrorMessage(data, fallback) {
  return (
    data?.detail ||
    data?.title ||
    data?.error ||
    data?.message ||
    fallback
  );
}

export async function loginUser({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, `Đăng nhập thất bại (${res.status})`))
  }

  return data
}

async function readJsonError(res, fallback) {
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty */
  }
  throw new Error(getErrorMessage(data, `${fallback} (${res.status})`))
}

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function getMyProfile(accessToken) {
  const res = await fetch('/api/auth/profile', {
    headers: authHeaders(accessToken),
  })

  if (!res.ok) await readJsonError(res, 'Không tải được hồ sơ')
  const data = await res.json()
  return data?.user ?? data
}

export async function refreshAuthToken(refreshToken) {
  const res = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty */
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, `Làm mới phiên đăng nhập thất bại (${res.status})`))
  }

  return data
}

export async function logoutUser({ accessToken, refreshToken }) {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ refreshToken: refreshToken || undefined }),
  })

  if (!res.ok) await readJsonError(res, 'Đăng xuất thất bại')
  return true
}

export async function forgotPassword(email) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty */
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, `Gửi mã OTP thất bại (${res.status})`))
  }

  return data
}

export async function resetPassword(payload) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty */
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, `Đặt lại mật khẩu thất bại (${res.status})`))
  }

  return data
}

const REGISTER_ROUTES = {
  SPECTATOR: '/api/auth/register/spectator',
  HORSE_OWNER: '/api/auth/register/horse-owner',
  JOCKEY: '/api/auth/register/jockey',
};

export async function registerUser(payload) {
  const { roleCode, ...body } = payload;
  const url = REGISTER_ROUTES[roleCode] ?? REGISTER_ROUTES.SPECTATOR;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, `Đăng ký thất bại (${res.status})`))
  }

  return data
}
