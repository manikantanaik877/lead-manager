const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'lead-manager-token'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details || {}
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== '' && v != null) url.searchParams.set(k, v)
  }

  const headers = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON body (e.g. a proxy error page) */
  }

  if (!res.ok) {
    // A 401 on a protected call means the session expired. Login failures are handled by the form.
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details)
  }
  return data
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  meta: () => request('/leads/meta'),
  stats: () => request('/leads/stats'),
  listLeads: (params, signal) => request('/leads', { params, signal }),
  createLead: (body) => request('/leads', { method: 'POST', body }),
  updateLead: (id, body) => request(`/leads/${id}`, { method: 'PUT', body }),
  deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
}
