import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

const AuthContext = createContext(null)

export function getErrorMessage(err) {
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Backend server is not running. Please start the server and try again.'
  }
  if (err.response?.data?.detail) {
    return err.response.data.detail
  }
  return 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('pillsync_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password })
    const userData = { ...res.data.user, isGuest: false }
    setUser(userData)
    localStorage.setItem('pillsync_user', JSON.stringify(userData))
    return res.data
  }, [])

  const register = useCallback(async (name, email, password, confirmPassword) => {
    const res = await axios.post(`${API}/auth/register`, {
      name, email, password, confirm_password: confirmPassword,
    })
    return res.data
  }, [])

  const guestLogin = useCallback(() => {
    const guest = { name: 'Guest User', email: 'guest@pillsync.ai', role: 'Patient', isGuest: true }
    setUser(guest)
    localStorage.setItem('pillsync_user', JSON.stringify(guest))
  }, [])

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`)
    } catch {
      // Logout even if API fails
    }
    setUser(null)
    localStorage.removeItem('pillsync_user')
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const res = await axios.post(`${API}/auth/forgot-password`, { email })
    return res.data
  }, [])

  const resetPassword = useCallback(async (email, newPassword) => {
    const res = await axios.post(`${API}/auth/reset-password`, { email, new_password: newPassword })
    return res.data
  }, [])

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, login, register, guestLogin, logout, forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
