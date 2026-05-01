import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
let refreshing = null
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = (async () => {
          const rt = localStorage.getItem('refreshToken')
          if (!rt) { logout(); return null }
          try {
            const { data } = await axios.post('/api/auth/refresh', { refreshToken: rt })
            localStorage.setItem('accessToken', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)
            return data.accessToken
          } catch {
            logout()
            return null
          } finally {
            refreshing = null
          }
        })()
      }
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }
    return Promise.reject(err)
  }
)

function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export default api
