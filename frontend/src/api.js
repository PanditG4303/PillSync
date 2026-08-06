import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const API = axios.create({
  baseURL: API_BASE,
})

export function getStoredToken() {
  try {
    return localStorage.getItem('pillsync_token')
  } catch {
    return null
  }
}

export function setStoredAuth(user, token) {
  localStorage.setItem('pillsync_user', JSON.stringify(user))
  if (token) {
    localStorage.setItem('pillsync_token', token)
  }
}

export function clearStoredAuth() {
  localStorage.removeItem('pillsync_user')
  localStorage.removeItem('pillsync_token')
}

export function getStoredPatientId() {
  try {
    const value = localStorage.getItem('pillsync_patient_id')
    return value ? Number(value) : null
  } catch {
    return null
  }
}

export function setStoredPatientId(patientId) {
  try {
    if (patientId) {
      localStorage.setItem('pillsync_patient_id', String(patientId))
    } else {
      localStorage.removeItem('pillsync_patient_id')
    }
  } catch {
    // ignore
  }
}

API.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const patientId = getStoredPatientId()
  if (patientId) {
    config.params = { ...(config.params || {}), patient_id: patientId }
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export { API_BASE }
export default API
