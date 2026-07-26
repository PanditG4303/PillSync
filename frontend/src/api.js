import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000',
})

API.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('pillsync_user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user && user.id) {
        config.headers['X-User-ID'] = user.id
      }
    }
  } catch {
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pillsync_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default API
