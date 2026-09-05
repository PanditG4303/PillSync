import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bell, Shield, Palette, Clock, Send, CheckCircle, XCircle, AlertCircle, Sun, Moon, User as UserIcon, KeyRound, Check, Loader2, MonitorSmartphone, Trash2, Volume2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import API, { API_BASE, setStoredAuth } from '../api'

function GoogleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.19 7.19 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Warsaw',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Manila',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function Toggle({ enabled, onChange, label, description }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{label}</p>
        {description && <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? (isLight ? 'bg-emerald-500' : 'bg-emerald-400') : (isLight ? 'bg-navy-200' : 'bg-white/[0.12]')
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

function Select({ value, onChange, options, label, description }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{label}</p>
        {description && <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`px-3 py-1.5 rounded-xl text-sm ${
          isLight
            ? 'bg-navy-50 border border-navy-200 text-navy-700'
            : 'bg-white/[0.06] border border-white/[0.08] text-white/70'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className={isLight ? 'bg-white' : 'bg-navy-800'}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SettingSection({ icon: Icon, title, children }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 md:p-6 rounded-3xl border ${
        isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
      }`}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
          isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  )
}

export default function Settings() {
  const { user, refreshUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isLight = theme === 'light'

  const [prefs, setPrefs] = useState({
    push_notifications_enabled: true,
    reminder_notifications_enabled: true,
    refill_notifications_enabled: true,
    email_notifications_enabled: true,
    sound_alerts_enabled: true,
    sms_notifications_enabled: false,
    sms_phone: '',
    sms_paused_until: null,
    advance_notice_minutes: 0,
    theme: 'dark',
    language: 'en',
    ocr_default_times_source: 'system',
    timezone: '',
  })
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [testResult, setTestResult] = useState('')
  const [permStatus, setPermStatus] = useState('checking')
  const [saving, setSaving] = useState(false)
  const [smsPausedBanner, setSmsPausedBanner] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('sms_paused') === '1' ? Number(params.get('hours') || 24) : null
  })

  const [name, setName] = useState(user?.name || '')
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)

  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsMsg, setSessionsMsg] = useState(null)

  const [aiKey, setAiKey] = useState(null)
  const [aiKeyInput, setAiKeyInput] = useState('')
  const [aiKeyMsg, setAiKeyMsg] = useState(null)
  const [aiKeySaving, setAiKeySaving] = useState(false)
  const [aiKeyTesting, setAiKeyTesting] = useState(false)

  const [googleStatus, setGoogleStatus] = useState(null)

  useEffect(() => {
    API.get('/auth/google/status')
      .then((res) => setGoogleStatus(!!res.data?.enabled))
      .catch(() => setGoogleStatus(false))
  }, [])

  const fetchAiKeyStatus = useCallback(async () => {
    try {
      const res = await API.get('/admin/ai-keys')
      setAiKey(res.data)
    } catch {
      setAiKey(null)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'Admin') fetchAiKeyStatus()
  }, [user, fetchAiKeyStatus])

  const saveAiKey = async () => {
    setAiKeyMsg(null)
    setAiKeySaving(true)
    try {
      const res = await API.put('/admin/ai-keys', { api_key: aiKeyInput.trim() })
      setAiKey(res.data)
      setAiKeyInput('')
      setAiKeyMsg({ type: 'success', text: 'AI API key saved. The assistant and OCR now use it.' })
    } catch (err) {
      setAiKeyMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to save the key.' })
    } finally {
      setAiKeySaving(false)
    }
  }

  const removeAiKey = async () => {
    setAiKeyMsg(null)
    try {
      const res = await API.delete('/admin/ai-keys')
      setAiKey(res.data)
      setAiKeyMsg({ type: 'success', text: 'Stored key removed. Falling back to the environment key (if any).' })
    } catch (err) {
      setAiKeyMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to remove the key.' })
    }
  }

  const testAiKey = async () => {
    setAiKeyMsg(null)
    setAiKeyTesting(true)
    try {
      const res = await API.post('/admin/ai-keys/test')
      setAiKey(res.data)
      setAiKeyMsg({ type: res.data.ok ? 'success' : 'error', text: res.data.message })
    } catch (err) {
      setAiKeyMsg({ type: 'error', text: err.response?.data?.detail || 'Connection test failed.' })
    } finally {
      setAiKeyTesting(false)
    }
  }

  const fetchSessions = useCallback(async () => {
    try {
      const res = await API.get('/auth/sessions')
      setSessions(res.data.sessions || [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const revokeSession = async (id) => {
    setSessionsMsg(null)
    try {
      await API.delete(`/auth/sessions/${id}`)
      setSessionsMsg({ type: 'success', text: 'Session revoked.' })
      fetchSessions()
    } catch (err) {
      setSessionsMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to revoke session.' })
    }
  }

  const revokeAllSessions = async () => {
    setSessionsMsg(null)
    try {
      await API.post('/auth/sessions/revoke-all')
      await logout()
      navigate('/')
    } catch (err) {
      setSessionsMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to revoke sessions.' })
    }
  }

  const formatSessionTime = (value) => {
    if (!value) return 'Unknown time'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return 'Unknown time'
    return d.toLocaleString()
  }

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await API.get('/settings/preferences')
      setPrefs(prev => ({ ...prev, ...res.data }))
    } catch {
      setPrefs({
        push_notifications_enabled: true,
        reminder_notifications_enabled: true,
        refill_notifications_enabled: true,
        email_notifications_enabled: true,
        sound_alerts_enabled: true,
        sms_notifications_enabled: false,
        sms_phone: '',
        sms_paused_until: null,
        advance_notice_minutes: 0,
        theme: 'dark',
        language: 'en',
        ocr_default_times_source: 'system',
        timezone: '',
      })
    } finally {
      setLoadingPrefs(false)
    }
  }, [])

  useEffect(() => {
    fetchPrefs()
  }, [fetchPrefs])

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermStatus('unsupported')
      return
    }
    setPermStatus(Notification.permission)
  }, [])

  const updatePref = async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaving(true)
    try {
      await API.put('/settings/preferences', { [key]: value })
    } catch {
      fetchPrefs()
    } finally {
      setSaving(false)
    }
  }

  const handlePushToggle = async (enabled) => {
    if (!enabled) {
      setPrefs(prev => ({ ...prev, push_notifications_enabled: false }))
      await updatePref('push_notifications_enabled', false)
      return
    }

    if (!('Notification' in window)) {
      setPermStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setPermStatus('denied')
      return
    }

    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setPermStatus(result)
      if (result !== 'granted') {
        return
      }
    }

    try {
      const firebase = await import('../firebase')
      firebase.initFirebase()
      await firebase.requestNotificationPermission()
    } catch {}

    setPrefs(prev => ({ ...prev, push_notifications_enabled: true }))
    await updatePref('push_notifications_enabled', true)
  }

  const handleTestNotification = async () => {
    setTestResult('sending')
    try {
      const res = await API.post('/fcm/test')
      if (res.data.send_attempted && res.data.send_successful) {
        setTestResult('success')
      } else if (res.data.send_attempted && !res.data.send_successful) {
        setTestResult('failed')
      } else if (res.data.registered_devices === 0) {
        setTestResult('no_device')
      } else {
        setTestResult('failed')
      }
    } catch {
      setTestResult('failed')
    }
    setTimeout(() => setTestResult(''), 5000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const res = await API.put('/settings/profile', {
        name: name.trim(),
        profile_picture: profilePicture.trim(),
      })
      setStoredAuth({ ...user, name: res.data.user.name, profile_picture: res.data.user.profile_picture }, null)
      await refreshUser()
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg(null)
    if (pwd.new_password !== pwd.confirm) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    setPwdSaving(true)
    try {
      await API.put('/settings/password', {
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      })
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' })
      setPwd({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' })
    } finally {
      setPwdSaving(false)
    }
  }

  const advanceOptions = [
    { value: 0, label: 'At time' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
  ]

  const permLabels = {
    granted: { text: 'Granted', icon: CheckCircle, color: 'text-emerald-400' },
    denied: { text: 'Blocked', icon: XCircle, color: 'text-red-400' },
    default: { text: 'Not enabled', icon: AlertCircle, color: 'text-orange-400' },
    unsupported: { text: 'Not supported', icon: AlertCircle, color: 'text-orange-400' },
  }

  const testResultMessages = {
    success: { text: 'Test notification sent.', color: 'text-emerald-400' },
    failed: { text: 'Firebase notification failed.', color: 'text-red-400' },
    no_device: { text: 'No registered notification device found.', color: 'text-orange-400' },
    sending: { text: 'Sending test notification...', color: 'text-cyan-400' },
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Settings</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Manage your account and preferences.</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        <div className={`p-5 md:p-6 flex items-center gap-4 rounded-3xl border ${
          isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
        }`}>
          <div className="w-16 h-16 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-navy-900 text-2xl font-bold shadow-glow-emerald shrink-0">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.name || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user?.name?.split(' ').map(n => n[0]).join('') || 'U'
            )}
          </div>
          <div>
            <p className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{user?.name || 'User'}</p>
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{user?.email || 'user@pillsync.ai'}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {user?.role || 'Patient'}
              </span>
              {user?.auth_provider === 'google' && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                  isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  <GoogleIcon className="w-3 h-3" /> Google
                </span>
              )}
            </div>
          </div>
        </div>

        {smsPausedBanner && (
          <div className={`flex items-center justify-between gap-4 px-5 py-4 rounded-3xl border ${
            isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/[0.08] border-amber-500/20'
          }`}>
            <div>
              <p className={`text-sm font-medium ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                SMS reminders paused for {smsPausedBanner} hour{smsPausedBanner > 1 ? 's' : ''}
              </p>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>
                Use Resume now below to start receiving texts sooner.
              </p>
            </div>
            <button
              onClick={() => setSmsPausedBanner(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isLight ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-white/[0.06] text-amber-300 hover:bg-white/[0.1]'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {loadingPrefs ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className={`skeleton h-28 ${isLight ? '!bg-navy-100' : ''}`} />)}
          </div>
        ) : (
          <>
            <SettingSection icon={UserIcon} title="Profile">
              <form onSubmit={handleSaveProfile}>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className={`text-sm font-medium mb-1.5 ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Display Name</p>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                            : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                        }`}
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-1.5 ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Profile Picture URL</p>
                      <input
                        type="url"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                          isLight
                            ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                            : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                        }`}
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaving || !name.trim() || name.trim() === user?.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
                {profileMsg && (
                  <p className={`text-xs mt-2 ${profileMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profileMsg.text}
                  </p>
                )}
              </form>
            </SettingSection>

            <SettingSection icon={GoogleIcon} title="Google Account">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>
                    {user?.auth_provider === 'google' ? 'Signed in with Google' : 'Link a Google Account'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                    {user?.auth_provider === 'google'
                      ? `Your account ${user?.email || ''} is connected to Google sign-in.`
                      : 'One-click sign-in with your Google account. Your profile picture is fetched automatically.'}
                  </p>
                </div>
                {user?.auth_provider === 'google' ? (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <a
                    href={`${API_BASE}/auth/google/authorize`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      googleStatus === null
                        ? 'opacity-50 pointer-events-none'
                        : googleStatus === false
                          ? 'opacity-50 pointer-events-none'
                          : isLight
                            ? 'bg-white border border-navy-200 text-navy-700 hover:bg-navy-50'
                            : 'bg-white/[0.06] border border-white/[0.1] text-white/80 hover:bg-white/[0.1]'
                    }`}
                  >
                    <GoogleIcon className="w-4 h-4" />
                    Connect Google
                  </a>
                )}
              </div>
              {user?.auth_provider === 'google' && (
                <p className={`text-[11px] mt-3 pt-3 border-t ${isLight ? 'text-navy-300 border-navy-100' : 'text-white/25 border-white/[0.06]'}`}>
                  To disconnect, sign out of all sessions or contact the administrator.
                </p>
              )}
            </SettingSection>

            <SettingSection icon={KeyRound} title="Change Password">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={pwd.current_password}
                  onChange={(e) => setPwd(prev => ({ ...prev, current_password: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                  }`}
                  autoComplete="current-password"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={pwd.new_password}
                  onChange={(e) => setPwd(prev => ({ ...prev, new_password: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                  }`}
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd(prev => ({ ...prev, confirm: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={pwdSaving || !pwd.current_password || !pwd.new_password}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                >
                  {pwdSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Update Password
                </button>
                {pwdMsg && (
                  <p className={`text-xs ${pwdMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pwdMsg.text}
                  </p>
                )}
              </form>
            </SettingSection>

            <SettingSection icon={Bell} title="Notifications">
              <Toggle
                enabled={prefs.push_notifications_enabled}
                onChange={handlePushToggle}
                label="Push Notifications"
                description={permStatus === 'denied' ? 'Notifications are blocked in your browser. Enable them from browser site settings.' : 'Receive push notifications for medicine reminders'}
              />
              <Toggle
                enabled={prefs.reminder_notifications_enabled}
                onChange={(val) => updatePref('reminder_notifications_enabled', val)}
                label="Reminder Notifications"
                description="Get notified at scheduled medicine times"
              />
              <Toggle
                enabled={prefs.refill_notifications_enabled !== false}
                onChange={(val) => updatePref('refill_notifications_enabled', val)}
                label="Refill Alerts"
                description="Get notified when medicine stock is running low"
              />
              <Toggle
                enabled={prefs.sound_alerts_enabled !== false}
                onChange={(val) => updatePref('sound_alerts_enabled', val)}
                label="Sound Alerts"
                description="Play a tone when a dose becomes due"
              />
              <Toggle
                enabled={prefs.email_notifications_enabled !== false}
                onChange={(val) => updatePref('email_notifications_enabled', val)}
                label="Email Reminders"
                description="Receive an email for each dose reminder and missed dose"
              />
              <div className="pt-4 border-t border-white/[0.06] space-y-4">
                <Toggle
                  enabled={prefs.sms_notifications_enabled}
                  onChange={(val) => updatePref('sms_notifications_enabled', val)}
                  label="SMS Reminders"
                  description="Receive one-time SMS texts for your dose reminders (SMS credits may apply)"
                />
                {prefs.sms_notifications_enabled && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Phone Number</p>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>With country code, e.g. +91XXXXXXXXXX</p>
                    </div>
                    <input
                      type="tel"
                      value={prefs.sms_phone || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d+]/g, '').slice(0, 16)
                        setPrefs(prev => ({ ...prev, sms_phone: value }))
                      }}
                      onBlur={() => updatePref('sms_phone', prefs.sms_phone || '')}
                      placeholder="+91 98765 43210"
                      className={`w-48 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                        isLight
                          ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                          : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                      }`}
                    />
                  </div>
                )}
                {prefs.sms_paused_until && (
                  <div className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${
                    isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-500/[0.08] border border-amber-500/20'
                  }`}>
                    <div>
                      <p className={`text-sm font-medium ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>SMS reminders paused</p>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>
                        Paused until {new Date(prefs.sms_paused_until).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await updatePref('sms_paused_until', null)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isLight
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      Resume now
                    </button>
                  </div>
                )}
              </div>
            </SettingSection>

            <SettingSection icon={Clock} title="Timing">
              <Select
                value={prefs.advance_notice_minutes}
                onChange={(val) => updatePref('advance_notice_minutes', val)}
                options={advanceOptions}
                label="Reminder Advance Notice"
                description="How early to notify you before each dose"
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Timezone</p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                    Used for reminder scheduling. Empty uses your device's timezone.
                  </p>
                </div>
                <select
                  value={prefs.timezone || ''}
                  onChange={(e) => updatePref('timezone', e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-700'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white/70'
                  }`}
                >
                  <option value="" className={isLight ? 'bg-white' : 'bg-navy-800'}>Device default</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className={isLight ? 'bg-white' : 'bg-navy-800'}>{tz}</option>
                  ))}
                </select>
              </div>
              <Toggle
                enabled={prefs.ocr_default_times_source === 'user'}
                onChange={(val) => updatePref('ocr_default_times_source', val ? 'user' : 'system')}
                label="Enter My Own Scan Times"
                description="Leave reminder times empty after a scan so you can enter your own when reviewing"
              />
            </SettingSection>

            <SettingSection icon={Palette} title="Appearance">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Application Theme</p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Light or dark mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                    isLight
                      ? 'bg-navy-100 text-navy-700 hover:bg-navy-200'
                      : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
                  }`}
                >
                  {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isLight ? 'Light' : 'Dark'}
                </button>
              </div>
            </SettingSection>

            <SettingSection icon={MonitorSmartphone} title="Who is logged in? · Sessions">
              <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                Active sign-ins for <span className="font-medium">{user?.email || 'your account'}</span>. Revoke any session to sign it out immediately.
              </p>
              {sessionsLoading ? (
                <div className={`skeleton h-16 ${isLight ? '!bg-navy-100' : ''}`} />
              ) : sessions.length === 0 ? (
                <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                  No active sessions found for this account.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${
                        isLight ? 'border-navy-100 bg-navy-50/50' : 'border-white/[0.06] bg-white/[0.03]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>
                          Session {s.id}
                        </p>
                        <p className={`text-xs truncate ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                          Signed in {formatSessionTime(s.created_at)}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 ${
                          s.active
                            ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                            : isLight ? 'bg-navy-100 text-navy-400' : 'bg-white/[0.06] text-white/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-white/20'}`} />
                          {s.active ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      {s.active && (
                        <button
                          onClick={() => revokeSession(s.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            isLight
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {sessions.length > 0 && (
                <button
                  onClick={revokeAllSessions}
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    isLight ? 'text-red-500 hover:text-red-600' : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Sign out of all sessions
                </button>
              )}
              {sessionsMsg && (
                <p className={`text-xs ${sessionsMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {sessionsMsg.text}
                </p>
              )}
            </SettingSection>

            {user?.role === 'Admin' && (
              <SettingSection icon={KeyRound} title="AI Service Key">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>OpenRouter API Key</p>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                      One shared key powers prescription OCR and the AI assistant
                    </p>
                  </div>
                  {aiKey ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      aiKey.configured
                        ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                        : isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {aiKey.configured ? 'Configured' : 'Not configured'}
                    </span>
                  ) : (
                    <div className={`skeleton h-6 w-24 ${isLight ? '!bg-navy-100' : ''}`} />
                  )}
                </div>

                {aiKey?.configured && (
                  <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                    Source: {aiKey.source === 'db' ? 'saved in app' : aiKey.source === 'env' ? 'environment (.env)' : 'none'}
                    {aiKey.masked_key ? ` · Key ${aiKey.masked_key}` : ''}
                  </p>
                )}

                <input
                  type="password"
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder="sk-or-..."
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                  }`}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={saveAiKey}
                    disabled={aiKeySaving || !aiKeyInput.trim()}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    }`}
                  >
                    {aiKeySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save key
                  </button>
                  <button
                    onClick={testAiKey}
                    disabled={aiKeyTesting}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 ${
                      isLight
                        ? 'bg-navy-100 text-navy-700 hover:bg-navy-200'
                        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
                    }`}
                  >
                    {aiKeyTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Test connection
                  </button>
                  {aiKey?.source === 'db' && (
                    <button
                      onClick={removeAiKey}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isLight
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                {aiKeyMsg && (
                  <p className={`text-xs ${aiKeyMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {aiKeyMsg.text}
                  </p>
                )}
              </SettingSection>
            )}

            <SettingSection icon={Shield} title="Notification Status">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Browser Permission</p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Current notification permission state</p>
                </div>
                {(() => {
                  const info = permLabels[permStatus] || permLabels.default
                  const Icon = info.icon
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${info.color}`}>
                      <Icon className="w-4 h-4" /> {info.text}
                    </span>
                  )
                })()}
              </div>
            </SettingSection>

            <SettingSection icon={Send} title="Test Notification">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>Send Test Notification</p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Verify FCM push is working</p>
                </div>
                <button
                  onClick={handleTestNotification}
                  disabled={testResult === 'sending'}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  } disabled:opacity-50`}
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
              {testResult && testResultMessages[testResult] && (
                <p className={`text-xs mt-2 ${testResultMessages[testResult].color}`}>
                  {testResultMessages[testResult].text}
                </p>
              )}
            </SettingSection>
          </>
        )}
      </motion.div>
    </div>
  )
}