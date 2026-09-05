import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronRight, Pill, HeartPulse, CheckCircle, Sparkles, Brain, TrendingUp,
  Clock, XCircle, AlertTriangle, Droplets, Moon, Flame, Salad, Sun, Activity,
  Bot, BellRing, BarChart3, Package,
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import { quickActions, moodOptions } from '../data'
import API from '../api'
import { formatTime, parseScheduleDatetime } from '../utils/datetime'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

function Card({ children, className = '', glow = false }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.div
      variants={itemAnim}
      className={`${glow ? 'gradient-border ' : ''}${
        isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'
      } p-5 md:p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

function CardHeader({ title, sub, icon: Icon, color = 'emerald', action }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colorMap = {
    emerald: isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400',
    cyan: isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400',
    violet: isLight ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400',
    orange: isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/20 text-orange-400',
    pink: isLight ? 'bg-pink-100 text-pink-600' : 'bg-pink-500/20 text-pink-400',
    blue: isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400',
    slate: isLight ? 'bg-navy-100 text-navy-500' : 'bg-white/[0.06] text-white/50',
  }
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${colorMap[color] || colorMap.emerald}`}>
          <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{title}</h2>
          {sub && <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, unit, color = 'emerald', hint }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colorMap = {
    emerald: isLight ? 'text-emerald-600 bg-emerald-100' : 'text-emerald-400 bg-emerald-500/20',
    cyan: isLight ? 'text-cyan-600 bg-cyan-100' : 'text-cyan-400 bg-cyan-500/20',
    violet: isLight ? 'text-violet-600 bg-violet-100' : 'text-violet-400 bg-violet-500/20',
    orange: isLight ? 'text-orange-600 bg-orange-100' : 'text-orange-400 bg-orange-500/20',
    pink: isLight ? 'text-pink-600 bg-pink-100' : 'text-pink-400 bg-pink-500/20',
    blue: isLight ? 'text-blue-600 bg-blue-100' : 'text-blue-400 bg-blue-500/20',
  }
  return (
    <div className={`p-4 rounded-2xl ${isLight ? 'bg-navy-50/60' : 'bg-white/[0.04]'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{label}</span>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={`text-xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
        {value ?? '—'}
        {unit && <span className={`text-xs font-medium ml-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{unit}</span>}
      </p>
      {hint && <p className={`text-[11px] mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{hint}</p>}
    </div>
  )
}

function ProgressBar({ value, max = 100, color = 'emerald' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  const gradients = {
    emerald: 'from-emerald-400 to-emerald-500',
    cyan: 'from-cyan-400 to-cyan-500',
    violet: 'from-violet-400 to-violet-500',
    orange: 'from-orange-400 to-orange-500',
    pink: 'from-pink-400 to-pink-500',
  }
  return (
    <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`h-full rounded-full bg-gradient-to-r ${gradients[color] || gradients.emerald}`}
      />
    </div>
  )
}

function WeeklyChart({ labels, values }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  if (!values || values.length === 0) return <p className={`text-sm text-center py-6 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>No data this week yet</p>
  return (
    <div className="flex items-end gap-2 h-36 pt-3">
      {values.map((val, i) => {
        const height = Math.max(val, 4)
        const color = val >= 90 ? 'from-emerald-400 to-emerald-500' : val >= 75 ? 'from-orange-400 to-orange-500' : 'from-red-400 to-red-500'
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className={`text-[9px] font-medium ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{val > 0 ? `${val}%` : ''}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full rounded-lg bg-gradient-to-t ${color}`}
              style={{ minHeight: 4 }}
            />
            <span className={`text-[9px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{labels?.[i] || ''}</span>
          </div>
        )
      })}
    </div>
  )
}

function Countdown({ target, reminder }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!target) return
    const tick = () => setRemaining(target.getTime() - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])
  if (remaining === null) return null
  const abs = Math.abs(remaining)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const nowMs = Date.now()
  let base = target.getTime()
  const snoozedUntil = reminder?.snoozed_until ? new Date(reminder.snoozed_until).getTime() : null
  if (snoozedUntil && snoozedUntil > base) base = snoozedUntil
  const onTimeEnd = base + 5 * 60000
  const deadline = base + 10 * 60000
  const toCutoff = deadline - nowMs
  if (toCutoff <= 0) {
    return <span className={`text-sm font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>Missed cutoff reached</span>
  }
  if (nowMs > onTimeEnd) {
    return (
      <div>
        <span className={`text-sm font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
          Late · misses in {m > 0 ? `${m}m ` : ''}{s}s
        </span>
        <p className={`text-[11px] mt-1 ${isLight ? 'text-navy-400' : 'text-white/35'}`}>
          Take before the 10-minute cutoff to avoid a missed dose
        </p>
      </div>
    )
  }
  if (remaining <= 0) {
    return (
      <div>
        <span className="text-sm font-bold text-emerald-400 animate-pulse-soft">
          Take now · {m > 0 ? `${m}m ` : ''}{s}s left to be on time
        </span>
        <p className={`text-[11px] mt-1 ${isLight ? 'text-navy-400' : 'text-white/35'}`}>
          On-time window: 5 minutes before and after the scheduled time
        </p>
      </div>
    )
  }
  if (remaining < 60000) {
    return <span className="text-sm font-bold text-emerald-400">Due in {s}s</span>
  }
  return <span className="text-lg font-mono font-bold tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
}

function ReminderRow({ reminder, onTaken, onSkipped, onSnooze, compact = false }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isPending = reminder.status === 'pending'
  const isSnoozed = reminder.snoozed_until && new Date(reminder.snoozed_until).getTime() > Date.now()
  const timeStr = formatTime(reminder.scheduled_datetime)
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl ${
      isPending
        ? isLight ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/20'
        : isLight ? 'bg-navy-50/60' : 'bg-white/[0.03]'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        reminder.status === 'taken' || reminder.status === 'late'
          ? isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
          : reminder.status === 'missed'
            ? isLight ? 'bg-red-100 text-red-500' : 'bg-red-500/20 text-red-400'
            : isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'
      }`}>
        <Pill className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/85'}`}>
          {reminder.medicine_name}
          <span className={`ml-1.5 text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            {[reminder.dosage, reminder.dosage_unit].filter(Boolean).join(' ')}
          </span>
        </p>
        <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/35'}`}>
          {timeStr}
          {isSnoozed && ' · Snoozed'}
        </p>
      </div>
      {isPending && !compact && (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onTaken(reminder.id)} title="Take now"
            className={`p-2 rounded-xl transition-all ${isLight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
            <CheckCircle className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onSnooze(reminder.id)} title="Snooze 10 min"
            className={`p-2 rounded-xl transition-all ${isLight ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}>
            <Clock className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onSkipped(reminder.id)} title="Skip"
            className={`p-2 rounded-xl transition-all ${isLight ? 'bg-navy-100 text-navy-500 hover:bg-navy-200' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.12]'}`}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {reminder.status === 'taken' && <CheckCircle className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />}
      {reminder.status === 'late' && <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/20 text-orange-400'}`}>Late</span>}
      {reminder.status === 'missed' && <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400'}`}>Missed</span>}
      {reminder.status === 'skipped' && <XCircle className={`w-4 h-4 shrink-0 ${isLight ? 'text-orange-500' : 'text-orange-400'}`} />}
    </div>
  )
}

function TimelineRow({ item }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const statusColor = {
    taken: 'bg-emerald-500',
    late: 'bg-orange-500',
    missed: 'bg-red-500',
    skipped: 'bg-orange-500',
    pending: 'bg-cyan-500',
  }
  const text = item.status === 'taken' ? `Took ${item.medicine_name}` :
    item.status === 'late' ? `Took ${item.medicine_name} (late)` :
    item.status === 'missed' ? `Missed ${item.medicine_name}` :
    item.status === 'skipped' ? `Skipped ${item.medicine_name}` : `${item.medicine_name} due`
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusColor[item.status] || 'bg-cyan-500'}`} />
      <p className={`text-sm flex-1 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>{text}</p>
      <span className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{formatTime(item.time)}</span>
    </div>
  )
}

function SkeletonGrid() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className={`skeleton h-32 ${isLight ? '!bg-navy-100' : ''}`} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState(null)
  const [refillAlerts, setRefillAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingMood, setSavingMood] = useState(false)
  const [moodSaved, setMoodSaved] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [summaryRes, refillRes] = await Promise.all([
        API.get('/dashboard/summary'),
        API.get('/refills/predictions'),
      ])
      setData(summaryRes.data)
      setRefillAlerts(refillRes.data?.alerts || [])
    } catch {
      setError('Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    const handleRefresh = () => fetchData()
    window.addEventListener('pillsync:reminders-updated', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('pillsync:reminders-updated', handleRefresh)
    }
  }, [])

  const handleTaken = async (id) => {
    try {
      await API.post(`/reminders/${id}/taken`)
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Could not mark dose as taken.')
    }
  }

  const handleSkipped = async (id) => {
    try {
      await API.post(`/reminders/${id}/skipped`)
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Could not skip dose.')
    }
  }

  const handleSnooze = async (id) => {
    try {
      await API.post(`/reminders/${id}/snoozed`, { minutes: 10 })
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Could not snooze reminder.')
    }
  }

  const handleMood = async (value) => {
    try {
      setSavingMood(true)
      await API.post('/health/metrics', { metric_type: 'mood', value })
      setMoodSaved(true)
      setTimeout(() => setMoodSaved(false), 2000)
      await fetchData()
    } catch {
      setError('Could not save mood.')
    } finally {
      setSavingMood(false)
    }
  }

  const nextReminder = useMemo(() => {
    if (!data) return null
    if (data.next_due_now) return { ...data.next_due_now, due: true }
    return data.upcoming_reminder ? { ...data.upcoming_reminder, due: false } : null
  }, [data])

  const countdownTarget = useMemo(() => {
    if (!nextReminder) return null
    const d = parseScheduleDatetime(nextReminder.scheduled_datetime)
    return d
  }, [nextReminder])

  const moodNow = data?.health?.mood?.value

  if (loading && !data) return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6"><div className="skeleton h-9 w-72 mb-2" /><div className="skeleton h-4 w-96" /></div>
      <SkeletonGrid />
      <div className="grid lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6"><div className="skeleton h-64" /><div className="skeleton h-64" /></div><div className="space-y-6"><div className="skeleton h-48" /><div className="skeleton h-48" /></div></div>
    </div>
  )

  const today = data?.today || {}
  const weekly = data?.weekly || {}
  const health = data?.health || {}
  const nutrition = data?.nutrition || {}

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div variants={itemAnim} className="mb-6 md:mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
                <span className="text-gradient">{user?.name?.split(' ')[0] || 'there'}</span>
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-navy-900'}`}>v2</span>
            </div>
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Your complete health overview for today.</p>
          </div>
          <div className="flex items-center gap-2">
            {refillAlerts.length > 0 && (
              <Link to="/refills" className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium border ${
                isLight ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
              }`}>
                <Package className="w-3.5 h-3.5" /> {refillAlerts.length} refill alert{refillAlerts.length > 1 ? 's' : ''}
              </Link>
            )}
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Sparkles className={`w-6 h-6 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemAnim} className={`mb-6 p-4 rounded-3xl border text-sm ${
          isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>{error}</motion.div>
      )}

      {/* Row 1: Today's Medicines + Adherence + Health Score + Water/Sleep */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader title="Today's Medicines" sub={`${today.stats?.total || 0} scheduled today`} icon={Pill} color="emerald"
            action={<span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'}`}>{today.stats?.pending || 0} due</span>} />
          <p className={`text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
            {today.stats?.taken || 0}
            <span className={`text-sm font-medium ml-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>/ {today.stats?.total || 0} taken</span>
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className={isLight ? 'text-navy-400' : 'text-white/40'}>Missed: {today.stats?.missed || 0}</span>
              <span className={isLight ? 'text-navy-400' : 'text-white/40'}>Skipped: {today.stats?.skipped || 0}</span>
              <span className={isLight ? 'text-navy-400' : 'text-white/40'}>Pending: {today.stats?.pending || 0}</span>
            </div>
            <ProgressBar value={today.stats?.taken || 0} max={Math.max(today.stats?.total || 1, 1)} color="emerald" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Medicine Adherence" sub="This week" icon={TrendingUp} color="violet"
            action={<span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/20 text-violet-400'}`}>{weekly.adherence || 0}%</span>} />
          <div className="flex items-end gap-1 mb-2">
            <p className={`text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{weekly.adherence || 0}%</p>
            <div className="flex-1 ml-3 mb-1.5">
              <ProgressBar value={weekly.adherence || 0} max={100} color="violet" />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className={isLight ? 'text-emerald-600' : 'text-emerald-400'}><CheckCircle className="w-3 h-3 inline mr-1" />{weekly.taken || 0} taken</span>
            <span className={isLight ? 'text-red-500' : 'text-red-400'}><AlertTriangle className="w-3 h-3 inline mr-1" />{weekly.missed || 0} missed</span>
            <span className={isLight ? 'text-orange-500' : 'text-orange-400'}><XCircle className="w-3 h-3 inline mr-1" />{weekly.skipped || 0} skipped</span>
          </div>
        </Card>

        <Card glow>
          <CardHeader title="AI Health Score" sub={health.score?.label || '—'} icon={Brain} color="cyan" />
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="42" fill="none" stroke={isLight ? '#E8EDF5' : 'rgba(255,255,255,0.06)'} strokeWidth="8" />
                <motion.circle
                  cx="48" cy="48" r="42" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - (health.score?.score || 0) / 100) }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{health.score?.score || 0}</span>
              </div>
            </div>
            <p className={`text-xs leading-relaxed flex-1 ${isLight ? 'text-navy-500' : 'text-white/50'}`}>{health.score?.message || ''}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Lifestyle" sub="Today's inputs" icon={Activity} color="pink" />
          <div className="grid grid-cols-2 gap-2.5">
            <MiniStat icon={Droplets} label="Water" value={nutrition.water_ml} unit="ml" color="cyan" hint={`${nutrition.progress?.water_ml || 0}% of target`} />
            <MiniStat icon={Moon} label="Sleep" value={health.metrics?.sleep} unit="hrs" color="violet" hint={health.metrics?.sleep >= 7 ? 'Good rest' : 'Aim for 7+ hrs'} />
            <MiniStat icon={Flame} label="Calories" value={nutrition.calories} unit="kcal" color="orange" hint={`${nutrition.progress?.calories || 0}% of target`} />
            <MiniStat icon={HeartPulse} label="Steps" value={health.metrics?.steps} unit="" color="pink" hint={health.metrics?.steps ? `${Math.round((health.metrics?.steps || 0) / 1000)}k steps` : 'Not logged'} />
          </div>
        </Card>
      </div>

      {/* Row 2: Weekly chart + AI Recommendation + Upcoming reminder */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Weekly Medicine Chart" sub="Daily adherence %" icon={BarChart3} color="blue"
            action={<Link to="/reports" className={`text-xs font-medium ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Reports</Link>} />
          <WeeklyChart labels={weekly.labels} values={weekly.daily_adherence} />
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="AI Recommendation" sub={health.ai_engine === 'ai' ? 'Nemotron-powered' : 'Based on your data'} icon={Bot} color="violet" />
          <p className={`text-sm leading-relaxed ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
            {health.ai_recommendation || 'Loading…'}
          </p>
          <div className={`mt-4 pt-3 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'}`}>
            <Link to="/ai-assistant" className={`text-xs font-medium flex items-center gap-1 ${isLight ? 'text-violet-600 hover:text-violet-500' : 'text-violet-400 hover:text-violet-300'}`}>
              Talk to the AI Assistant <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-1" glow>
          <CardHeader title={nextReminder?.due ? 'Due Now' : 'Upcoming Reminder'} sub="Next dose" icon={Clock} color="orange"
            action={nextReminder && <Link to="/reminders" className={`text-xs font-medium ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>All reminders</Link>} />
          {nextReminder ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-base font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{nextReminder.medicine_name}</p>
                  <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                    {[nextReminder.dosage, nextReminder.dosage_unit].filter(Boolean).join(' ')} · {formatTime(nextReminder.scheduled_datetime)}
                  </p>
                </div>
              </div>
              <div className="text-center py-2">
                <Countdown target={countdownTarget} reminder={nextReminder} />
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => handleTaken(nextReminder.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${isLight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                  <CheckCircle className="w-4 h-4 inline mr-1" /> Take Now
                </button>
                <button type="button" onClick={() => handleSnooze(nextReminder.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${isLight ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}>
                  <Clock className="w-4 h-4 inline mr-1" /> Snooze
                </button>
                <button type="button" onClick={() => handleSkipped(nextReminder.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isLight ? 'bg-navy-100 text-navy-500 hover:bg-navy-200' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.12]'}`}>
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <BellRing className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
              <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No more doses scheduled for today</p>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Today's medicines + Timeline + Missed + Streak/Mood/QuickActions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Today's Medicines" sub="Take action on each dose" icon={Pill} color="emerald"
              action={today.reminders?.length > 0 && <Link to="/reminders" className={`text-xs font-medium ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>View timeline</Link>} />
            <div className="space-y-2">
              {today.reminders?.length === 0 ? (
                <p className={`text-sm text-center py-6 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No medicines scheduled for today.</p>
              ) : (
                today.reminders.map((rem) => (
                  <ReminderRow key={rem.id} reminder={rem} onTaken={handleTaken} onSkipped={handleSkipped} onSnooze={handleSnooze} />
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reminder Timeline" sub="Today at a glance" icon={Clock} color="cyan"
              action={<Link to="/history" className={`text-xs font-medium ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Full history</Link>} />
            {data?.timeline?.length ? (
              <div className="divide-y divide-white/[0.04]">
                {data.timeline.map((item, i) => <TimelineRow key={i} item={item} />)}
              </div>
            ) : (
              <p className={`text-sm text-center py-6 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No activity today yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Missed Doses" sub={today.missed > 0 ? 'Needs attention' : 'All caught up'} icon={AlertTriangle} color={today.missed > 0 ? 'orange' : 'emerald'} />
            <p className={`text-3xl font-bold ${today.missed > 0 ? 'text-orange-500' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
              {today.missed || 0}
            </p>
            <p className={`text-xs mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
              {today.missed > 0 ? `${today.missed} dose${today.missed > 1 ? 's' : ''} missed today — check the reminders page for the full missed report.` : 'No missed doses today. Great work!'}
            </p>
          </Card>

          <Card>
            <CardHeader title="Current Streak" sub="Perfect days in a row" icon={Flame} color="orange" />
            <div className="flex items-center gap-3">
              <p className={`text-3xl font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{weekly.streak || 0}</p>
              <span className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>days</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={Math.min(weekly.streak || 0, 7)} max={7} color="orange" />
              <p className={`text-[11px] mt-1 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>7-day target</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Today's Mood" sub="How are you feeling?" icon={Sun} color="pink"
              action={moodSaved && <span className={`text-[10px] font-medium ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Saved!</span>} />
            <div className="flex items-center justify-between gap-1">
              {moodOptions.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={savingMood}
                  onClick={() => handleMood(m.value)}
                  title={m.label}
                  className={`p-2.5 rounded-2xl text-xl transition-all ${
                    moodNow === m.value
                      ? isLight ? 'bg-pink-100 ring-2 ring-pink-300 scale-110' : 'bg-pink-500/20 ring-2 ring-pink-400/40 scale-110'
                      : isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <p className={`text-[11px] mt-2 text-center ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
              {moodNow ? `Logged: ${moodOptions.find((m) => m.value === moodNow)?.label}` : 'Tap an emoji to log your mood'}
            </p>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" sub="Jump to any module" icon={Sparkles} color="violet" />
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.to} className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-medium transition-all ${
                  isLight ? 'bg-navy-50 hover:bg-emerald-50 hover:text-emerald-700 text-navy-600' : 'bg-white/[0.04] hover:bg-emerald-500/10 text-white/60 hover:text-emerald-400'
                }`}>
                  <action.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Nutrition Summary" sub={`${nutrition.meals || 0} meal${nutrition.meals === 1 ? '' : 's'} logged today`} icon={Salad} color="lime" />
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Calories · {nutrition.calories || 0} kcal</span>
                  <span className={isLight ? 'text-navy-400' : 'text-white/30'}>{nutrition.progress?.calories || 0}%</span>
                </div>
                <ProgressBar value={nutrition.calories || 0} max={nutrition.targets?.calories || 2000} color="orange" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Protein · {nutrition.protein || 0} g</span>
                  <span className={isLight ? 'text-navy-400' : 'text-white/30'}>{nutrition.progress?.protein || 0}%</span>
                </div>
                <ProgressBar value={nutrition.protein || 0} max={nutrition.targets?.protein || 60} color="pink" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Water · {nutrition.water_ml || 0} ml</span>
                  <span className={isLight ? 'text-navy-400' : 'text-white/30'}>{nutrition.progress?.water_ml || 0}%</span>
                </div>
                <ProgressBar value={nutrition.water_ml || 0} max={nutrition.targets?.water_ml || 2500} color="cyan" />
              </div>
              <Link to="/nutrition" className={`block text-center text-xs font-medium pt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                Log a meal <ChevronRight className="w-3 h-3 inline" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
