import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bell, Shield, Palette, Clock, Send, CheckCircle, XCircle, AlertCircle, Sun, Moon } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import API from '../api'

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
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  const [prefs, setPrefs] = useState({
    push_notifications_enabled: true,
    reminder_notifications_enabled: true,
    refill_notifications_enabled: true,
    advance_notice_minutes: 0,
  })
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [testResult, setTestResult] = useState('')
  const [permStatus, setPermStatus] = useState('checking')
  const [saving, setSaving] = useState(false)

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await API.get('/settings/preferences')
      setPrefs(res.data)
    } catch {
      setPrefs({
        push_notifications_enabled: true,
        reminder_notifications_enabled: true,
        refill_notifications_enabled: true,
        advance_notice_minutes: 0,
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
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-navy-900 text-2xl font-bold shadow-glow-emerald">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div>
            <p className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{user?.name || 'User'}</p>
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{user?.email || 'user@pillsync.ai'}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 border ${
              isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {user?.role || 'Patient'}
            </span>
          </div>
        </div>

        {loadingPrefs ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className={`skeleton h-28 ${isLight ? '!bg-navy-100' : ''}`} />)}
          </div>
        ) : (
          <>
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
            </SettingSection>

            <SettingSection icon={Clock} title="Timing">
              <Select
                value={prefs.advance_notice_minutes}
                onChange={(val) => updatePref('advance_notice_minutes', val)}
                options={advanceOptions}
                label="Reminder Advance Notice"
                description="How early to notify you before each dose"
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