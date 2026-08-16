import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import API from '../api'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('pillsync_theme')
    return stored || 'dark'
  })
  const syncedFromServer = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('pillsync_token')
    if (!token) return
    let cancelled = false
    API.get('/settings/preferences')
      .then((res) => {
        if (cancelled) return
        const serverTheme = res.data?.theme
        if (serverTheme === 'dark' || serverTheme === 'light') {
          syncedFromServer.current = true
          setTheme(serverTheme)
          localStorage.setItem('pillsync_theme', serverTheme)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('pillsync_theme', next)
      API.put('/settings/preferences', { theme: next }).catch(() => {})
      return next
    })
  }, [])

  const applyTheme = useCallback((next) => {
    setTheme(prev => {
      if (next === prev) return prev
      localStorage.setItem('pillsync_theme', next)
      API.put('/settings/preferences', { theme: next }).catch(() => {})
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, applyTheme, syncedFromServer }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
