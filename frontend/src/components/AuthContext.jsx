import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import API, { API_BASE, setStoredAuth, clearStoredAuth, getStoredToken } from '../api'

const AuthContext = createContext(null)

export function getErrorMessage(err) {
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Backend server is not running. Please start the server and try again.'
  }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || String(d)).join(', ')
  }
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      const token = getStoredToken()
      const stored = localStorage.getItem('pillsync_user')
      if (!token || !stored) {
        clearStoredAuth()
        if (!cancelled) {
          setUser(null)
          setBootstrapping(false)
        }
        return
      }
      try {
        const res = await API.get('/auth/me')
        if (!cancelled) {
          const userData = { ...res.data, isGuest: false }
          setUser(userData)
          setStoredAuth(userData, token)
        }
      } catch {
        clearStoredAuth()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    bootstrap()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password })
    const userData = { ...res.data.user, isGuest: false }
    setUser(userData)
    setStoredAuth(userData, res.data.access_token)
    return res.data
  }, [])

  const register = useCallback(async (name, email, password, confirmPassword, role = 'Patient') => {
    const res = await axios.post(`${API_BASE}/auth/register`, {
      name,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    })
    if (res.data.access_token) {
      const userData = { ...res.data.user, isGuest: false }
      setUser(userData)
      setStoredAuth(userData, res.data.access_token)
    }
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await API.post('/auth/logout')
    } catch {
      // ignore
    }
    setUser(null)
    clearStoredAuth()
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email })
    return res.data
  }, [])

  const resetPassword = useCallback(async (token, newPassword) => {
    const res = await axios.post(`${API_BASE}/auth/reset-password`, {
      token,
      new_password: newPassword,
    })
    return res.data
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        bootstrapping,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
