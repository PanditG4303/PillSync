import { useState, useEffect, useRef } from 'react'
import { Bell, Search, User, ChevronDown, LogOut, Settings as SettingsIcon, HelpCircle, Sparkles, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { useNavigate } from 'react-router-dom'
import API from '../api'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [notifications, setNotifications] = useState([])
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const searchResultsRef = useRef(null)

  const [notifBadge, setNotifBadge] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/reminders/today')
      const pending = (res.data.reminders || []).filter(r => r.status === 'pending')
      setNotifBadge(pending.length)
      setNotifications(
        pending.slice(0, 5).map(r => ({
          text: `Time to take ${r.medicine_name}`,
          time: r.scheduled_datetime
            ? new Date(r.scheduled_datetime + '+05:30').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          type: 'reminder',
        }))
      )
    } catch {
      setNotifications([])
      setNotifBadge(0)
    }
  }

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
    setShowProfile(false)
    if (!showNotifications) {
      fetchNotifications()
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    const handleRefresh = () => fetchNotifications()
    window.addEventListener('pillsync:reminders-updated', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('pillsync:reminders-updated', handleRefresh)
    }
  }, [])

  useEffect(() => {
    const fetchSearch = async () => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      try {
        const res = await API.get('/medicines')
        const meds = (res.data || []).filter(m =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          (m.dosage && m.dosage.toLowerCase().includes(query.toLowerCase()))
        )
        setSearchResults(
          meds.map(m => ({
            label: m.name,
            sub: m.dosage ? `${m.dosage} ${m.dosage_unit || ''}`.trim() : m.medicine_type || 'Medicine',
            type: 'Medicine',
            route: '/add-medicine',
          }))
        )
      } catch {
        setSearchResults([])
      }
    }
    const timer = setTimeout(fetchSearch, 200)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowNotifications(false)
        setShowProfile(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSearchNavigate = (item) => {
    setShowSearch(false)
    setQuery('')
    navigate(item.route)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      handleSearchNavigate(searchResults[selectedIndex])
    }
  }

  useEffect(() => {
    if (searchResultsRef.current) {
      const selected = searchResultsRef.current.querySelector('[data-selected="true"]')
      selected?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const notifIcons = {
    reminder: 'bg-emerald-500/20 text-emerald-400',
    refill: 'bg-orange-500/20 text-orange-400',
    report: 'bg-cyan-500/20 text-cyan-400',
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className={`h-16 ${
      theme === 'light'
        ? 'bg-white/80 backdrop-blur-2xl border-b border-navy-100'
        : 'bg-navy-900/60 backdrop-blur-2xl border-b border-white/[0.06]'
    } flex items-center justify-between px-4 md:px-6 sticky top-0 z-30`}>
      <div className="flex items-center gap-4 w-full max-w-md">
        <div className="relative w-full group">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
            theme === 'light' ? 'text-navy-300 group-focus-within:text-emerald-500' : 'text-white/30 group-focus-within:text-emerald-400'
          } transition-colors`} />
          <input
            type="text"
            placeholder="Search medicines..."
            value={query}
            onFocus={() => setShowSearch(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSearch(true)
            }}
            onKeyDown={handleSearchKeyDown}
            ref={searchInputRef}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all duration-200 ${
              theme === 'light'
                ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-navy-300'
                : 'bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 focus:bg-white/[0.06] placeholder:text-white/30'
            }`}
          />
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] ${
            theme === 'light' ? 'text-navy-300' : 'text-white/20'
          }`}>
            <kbd className={`px-1.5 py-0.5 rounded-md font-mono ${
              theme === 'light' ? 'bg-navy-100 border border-navy-200' : 'bg-white/[0.06] border border-white/[0.08]'
            }`}>Ctrl</kbd>
            <kbd className={`px-1.5 py-0.5 rounded-md font-mono ${
              theme === 'light' ? 'bg-navy-100 border border-navy-200' : 'bg-white/[0.06] border border-white/[0.08]'
            }`}>K</kbd>
          </div>

          <AnimatePresence>
            {showSearch && query.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-2 left-0 right-0 rounded-2xl overflow-hidden z-50 ${
                  theme === 'light' ? 'bg-white border border-navy-100 shadow-lg' : 'glass-card'
                }`}
                ref={searchResultsRef}
              >
                <div className="p-2">
                  {searchResults.length === 0 ? (
                    <div className={`p-4 text-center text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                      No results found for "{query}"
                    </div>
                  ) : (
                    searchResults.map((item, i) => {
                      const Icon = item.icon
                      const typeColors = {
                        Medicine: theme === 'light' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400',
                      }
                      return (
                        <button
                          key={`${item.label}-${i}`}
                          data-selected={i === selectedIndex}
                          onClick={() => handleSearchNavigate(item)}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-colors ${
                            i === selectedIndex
                              ? theme === 'light' ? 'bg-navy-50' : 'bg-white/[0.08]'
                              : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeColors[item.type] || (theme === 'light' ? 'bg-navy-100 text-navy-500' : 'bg-white/[0.06] text-white/50')}`}>
                            {Icon ? <Icon className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${theme === 'light' ? 'text-navy-700' : 'text-white/80'}`}>{item.label}</p>
                            <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/30'}`}>{item.sub}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            theme === 'light' ? 'bg-navy-100 text-navy-400' : 'bg-white/[0.06] text-white/30'
                          }`}>{item.type}</span>
                        </button>
                      )
                    })
                  )}
                </div>
                <div className={`px-3 py-2 border-t flex items-center justify-between text-[10px] ${
                  theme === 'light' ? 'border-navy-100 text-navy-400' : 'border-white/[0.06] text-white/30'
                }`}>
                  <span>{searchResults.length} results</span>
                  <span>↑↓ navigate · enter select · esc close</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl transition-all ${
            theme === 'light' ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-100' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </motion.button>

        <div className="relative">
          <button
            onClick={handleBellClick}
            className={`p-2.5 rounded-2xl transition-all ${
              theme === 'light' ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-100' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
            } relative`}
          >
            <Bell className="w-5 h-5" />
            {notifBadge > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                theme === 'light' ? 'bg-emerald-500 text-white ring-2 ring-white' : 'bg-emerald-400 text-navy-900 ring-2 ring-navy-900'
              }`}>
                {notifBadge > 9 ? '9+' : notifBadge}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-2 w-80 rounded-3xl overflow-hidden ${
                  theme === 'light' ? 'bg-white border border-navy-100 shadow-lg' : 'glass-card'
                }`}
              >
                <div className={`p-4 border-b ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'}`}>
                  <p className={`text-sm font-semibold ${theme === 'light' ? 'text-navy-700' : 'text-white/90'}`}>Notifications</p>
                </div>
                <div className="p-2">
                  {notifications.length === 0 ? (
                    <div className={`p-4 text-center text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer ${
                        theme === 'light' ? 'hover:bg-navy-50' : 'hover:bg-white/[0.04]'
                      } transition-colors`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notifIcons[n.type]}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${theme === 'light' ? 'text-navy-600' : 'text-white/80'}`}>{n.text}</p>
                          <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/30'} mt-0.5`}>{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            className={`flex items-center gap-2 border-l ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} pl-3 py-1 rounded-2xl pr-2 transition-colors ${
              theme === 'light' ? 'hover:bg-navy-50' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4 text-navy-900" />
            </div>
            <div className="text-left hidden sm:block">
              <p className={`text-sm font-medium leading-tight ${theme === 'light' ? 'text-navy-700' : 'text-white/90'}`}>{user?.name || 'User'}</p>
              <p className={`text-[10px] ${theme === 'light' ? 'text-navy-400' : 'text-white/30'}`}>{user?.role || 'Patient'}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-navy-300' : 'text-white/30'} hidden sm:block`} />
          </button>
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-2 w-56 rounded-3xl overflow-hidden ${
                  theme === 'light' ? 'bg-white border border-navy-100 shadow-lg' : 'glass-card'
                }`}
              >
                <div className={`p-4 border-b ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'}`}>
                  <p className={`text-sm font-semibold ${theme === 'light' ? 'text-navy-700' : 'text-white/90'}`}>{user?.name}</p>
                  <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>{user?.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => { navigate('/settings'); setShowProfile(false) }} className={`flex items-center gap-3 w-full p-3 rounded-2xl text-sm transition-colors ${
                    theme === 'light' ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-50' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'
                  }`}>
                    <SettingsIcon className="w-4 h-4" /> Settings
                  </button>
                  <button className={`flex items-center gap-3 w-full p-3 rounded-2xl text-sm transition-colors ${
                    theme === 'light' ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-50' : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'
                  }`}>
                    <HelpCircle className="w-4 h-4" /> Help & Support
                  </button>
                  <div className={`border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} mt-1 pt-1`}>
                    <button onClick={() => { handleLogout() }} className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-red-500/10 transition-colors text-sm text-red-400">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
