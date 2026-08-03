import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronRight, Pill, HeartPulse, CheckCircle, Sparkles, Brain, TrendingUp,
  Clock, XCircle, AlertTriangle, Package,
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import { quickActions } from '../data'
import API from '../api'
import { formatTime, parseScheduleDatetime } from '../utils/datetime'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

function StatCard({ label, value, sub, icon: Icon, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const iconColor = isLight
    ? ['text-emerald-600 bg-emerald-100', 'text-cyan-600 bg-cyan-100', 'text-violet-600 bg-violet-100', 'text-orange-600 bg-orange-100', 'text-pink-600 bg-pink-100', 'text-emerald-600 bg-emerald-100']
    : ['text-emerald-400 bg-emerald-500/20', 'text-cyan-400 bg-cyan-500/20', 'text-violet-400 bg-violet-500/20', 'text-orange-400 bg-orange-500/20', 'text-pink-400 bg-pink-500/20', 'text-emerald-400 bg-emerald-500/20']
  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 transition-all duration-300 ${
        isLight
          ? 'bg-white rounded-3xl shadow-sm border border-navy-100 hover:shadow-md'
          : 'glass-card-hover'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconColor[index % iconColor.length]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{sub}</p>
    </motion.div>
  )
}

function ReminderItem({ reminder, onTaken, onSkipped }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const scheduled = parseScheduleDatetime(reminder.scheduled_datetime)
  const isPending = reminder.status === 'pending'
  const isDue = isPending && scheduled && scheduled.getTime() <= Date.now()
  const isUpcoming = isPending && scheduled && scheduled.getTime() > Date.now()
  const isPast = ['taken', 'late', 'skipped', 'missed'].includes(reminder.status)
  const timeStr = formatTime(reminder.scheduled_datetime)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
      isDue ? (isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/20') :
      isPast ? (isLight ? 'bg-navy-50 opacity-60' : 'bg-white/[0.03] opacity-60') :
      (isLight ? 'bg-white border border-navy-100' : 'bg-white/[0.04]')
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        isDue ? 'bg-emerald-500 text-white' :
        isUpcoming ? (isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400') :
        isPast ? (isLight ? 'bg-navy-100 text-navy-400' : 'bg-white/[0.06] text-white/30') :
        (isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400')
      }`}>
        <Pill className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>
          {reminder.medicine_name}
          <span className={`ml-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{reminder.dosage}</span>
        </p>
        <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{timeStr}</p>
      </div>
      {isPending && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Mark ${reminder.medicine_name} as taken`}
            onClick={() => onTaken(reminder.id)}
            className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
              isLight ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={`Skip ${reminder.medicine_name}`}
            onClick={() => onSkipped(reminder.id)}
            className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
              isLight ? 'bg-navy-100 text-navy-400 hover:bg-navy-200' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.10]'
            }`}
          >
            <XCircle className="w-4 h-4" />
          </button>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            isDue
              ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400')
              : (isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400')
          }`}>{isDue ? 'Due' : 'Upcoming'}</span>
        </div>
      )}
      {reminder.status === 'taken' && <CheckCircle className={`w-4 h-4 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />}
      {reminder.status === 'skipped' && <XCircle className={`w-4 h-4 ${isLight ? 'text-orange-500' : 'text-orange-400'}`} />}
      {reminder.status === 'late' && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'}`}>Late</span>}
      {reminder.status === 'missed' && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-400'}`}>Missed</span>}
    </div>
  )
}

function QuickAction({ label, icon: Icon, to, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const bgColors = isLight ? ['bg-emerald-100', 'bg-cyan-100', 'bg-violet-100', 'bg-orange-100'] : ['bg-emerald-500/20', 'bg-cyan-500/20', 'bg-violet-500/20', 'bg-orange-500/20']
  const textColors = isLight ? ['text-emerald-600', 'text-cyan-600', 'text-violet-600', 'text-orange-600'] : ['text-emerald-400', 'text-cyan-400', 'text-violet-400', 'text-orange-400']
  return (
    <Link to={to} className={`flex items-center gap-3 p-3 rounded-2xl transition-colors group ${isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.04]'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColors[index % bgColors.length]}`}>
        <Icon className={`w-4 h-4 ${textColors[index % textColors.length]}`} />
      </div>
      <span className={`text-sm font-medium transition-colors flex-1 ${isLight ? 'text-navy-500 group-hover:text-navy-700' : 'text-white/60 group-hover:text-white/90'}`}>{label}</span>
      <ChevronRight className={`w-4 h-4 transition-colors ${isLight ? 'text-navy-300 group-hover:text-navy-500' : 'text-white/20 group-hover:text-white/40'}`} />
    </Link>
  )
}

function TimelineItem({ time, text, status }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colors = { success: 'bg-emerald-500', danger: 'bg-red-500', info: 'bg-cyan-500', warning: 'bg-orange-500' }
  return (
    <div className={`flex items-start gap-3 py-2.5 group`}>
      <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-cyan-500'} mt-2`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm transition-colors ${isLight ? 'text-navy-600 group-hover:text-navy-800' : 'text-white/70 group-hover:text-white/90'}`}>{text}</p>
        <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{time}</p>
      </div>
    </div>
  )
}

function AdherenceChart({ values, labels }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  if (!values || values.length === 0) return null
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {values.map((val, i) => {
        const height = Math.max(val, 5)
        const isHigh = val >= 90
        const isMid = val >= 75
        const gradient = isHigh ? 'from-emerald-400 to-emerald-500' : isMid ? 'from-orange-400 to-orange-500' : 'from-red-400 to-red-500'
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-medium ${isLight ? 'text-navy-400' : 'text-white/50'}`}>{val}%</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full rounded-lg bg-gradient-to-t ${gradient} ${isHigh && !isLight ? 'shadow-glow-emerald' : ''}`}
              style={{ maxHeight: '160px', minHeight: '20px' }}
            />
            <span className={`text-[10px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{labels?.[i] || ''}</span>
          </div>
        )
      })}
    </div>
  )
}

function CountdownTimer({ scheduledDatetime }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!scheduledDatetime) return
    const scheduled = parseScheduleDatetime(scheduledDatetime)
    if (!scheduled) return
    const tick = () => {
      setRemaining(scheduled.getTime() - Date.now())
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [scheduledDatetime])

  if (remaining === null) return null

  const absRemaining = Math.abs(remaining)
  const hours = Math.floor(absRemaining / 3600000)
  const minutes = Math.floor((absRemaining % 3600000) / 60000)
  const seconds = Math.floor((absRemaining % 60000) / 1000)

  if (remaining <= 0 && remaining > -60000) {
    return <span className={`text-base font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'} animate-pulse-soft`}>Due now</span>
  }
  if (remaining <= -60000) {
    return <span className={`text-base font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>Overdue by {minutes > 0 ? `${minutes}m ` : ''}{seconds}s</span>
  }
  if (remaining < 60000) {
    return <span className={`text-base font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Due in {seconds} seconds</span>
  }

  const pad = (n) => String(n).padStart(2, '0')
  return (
    <span className={`text-base font-mono font-bold tabular-nums ${isLight ? 'text-navy-700' : 'text-white'}`}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  )
}

function NextMedicineCard({ reminder, onTaken, onSkipped }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  if (!reminder) return null

  const timeStr = formatTime(reminder.scheduled_datetime)
  const dosageStr = [reminder.dosage, reminder.dosage_unit].filter(Boolean).join(' ')

  return (
    <div className={`p-5 md:p-6 rounded-3xl border ${
      isLight ? 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200' : 'glass-card'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Next Medicine</h2>
        <Clock className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
          isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Pill className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-base font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{reminder.medicine_name}</p>
          {dosageStr && (
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{dosageStr}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Scheduled: {timeStr}</span>
      </div>
      <div className="text-center py-3">
        <CountdownTimer scheduledDatetime={reminder.scheduled_datetime} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          aria-label={`Mark ${reminder.medicine_name} as taken`}
          onClick={() => onTaken(reminder.id)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            isLight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline mr-1" /> Taken
        </button>
        <button
          type="button"
          aria-label={`Skip ${reminder.medicine_name}`}
          onClick={() => onSkipped(reminder.id)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            isLight ? 'bg-navy-100 text-navy-600 hover:bg-navy-200' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
          }`}
        >
          <XCircle className="w-4 h-4 inline mr-1" /> Skip
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [reminders, setReminders] = useState([])
  const [stats, setStats] = useState(null)
  const [adherence, setAdherence] = useState(null)
  const [refillAlerts, setRefillAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [reminderRes, adherenceRes, refillRes] = await Promise.all([
        API.get('/reminders/today'),
        API.get('/reports/adherence'),
        API.get('/refills/predictions'),
      ])
      setReminders(reminderRes.data.reminders || [])
      setStats(reminderRes.data.stats || null)
      setAdherence(adherenceRes.data || null)
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
      setError('')
      await API.post(`/reminders/${id}/taken`)
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Could not mark dose as taken. Please try again.')
    }
  }

  const handleSkipped = async (id) => {
    try {
      setError('')
      await API.post(`/reminders/${id}/skipped`)
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Could not skip dose. Please try again.')
    }
  }

  const now = Date.now()
  const pendingReminders = reminders.filter(r => r.status === 'pending')
  const upcoming = pendingReminders
    .filter(r => {
      const d = parseScheduleDatetime(r.scheduled_datetime)
      return d && d.getTime() > now
    })
    .sort((a, b) => {
      const da = parseScheduleDatetime(a.scheduled_datetime)?.getTime() || 0
      const db = parseScheduleDatetime(b.scheduled_datetime)?.getTime() || 0
      return da - db
    })
  const overduePending = pendingReminders
    .filter(r => {
      const d = parseScheduleDatetime(r.scheduled_datetime)
      return d && d.getTime() <= now
    })
    .sort((a, b) => {
      const da = parseScheduleDatetime(a.scheduled_datetime)?.getTime() || 0
      const db = parseScheduleDatetime(b.scheduled_datetime)?.getTime() || 0
      return da - db
    })
  const nextReminder = overduePending[0] || upcoming[0] || null

  const completedReminders = reminders.filter(r => r.status !== 'pending')

  const statCards = stats ? [
    { label: "Today's Medicines", value: stats.total.toString(), sub: `${stats.pending} remaining`, icon: Pill },
    { label: 'Taken', value: stats.taken.toString(), sub: 'Doses completed', icon: CheckCircle },
    { label: 'Adherence', value: `${stats.adherence}%`, sub: 'Today', icon: TrendingUp },
    { label: 'Pending', value: stats.pending.toString(), sub: 'Awaiting action', icon: Clock },
    { label: 'Missed', value: stats.missed.toString(), sub: 'Doses missed', icon: AlertTriangle },
    { label: 'Skipped', value: stats.skipped.toString(), sub: 'Doses skipped', icon: XCircle },
  ] : []

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={itemAnim} className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
              <span className="text-gradient">{user?.name?.split(' ')[0] || 'there'}</span>
            </h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Here's your health overview for today.</p>
          </div>
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <Sparkles className={`w-6 h-6 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          </motion.div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemAnim} className={`mb-6 p-4 rounded-3xl border text-sm ${
          isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>{error}</motion.div>
      )}

      {loading ? (
        <motion.div variants={itemAnim} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className={`skeleton h-28 ${isLight ? '!bg-navy-100' : ''}`} />)}
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemAnim} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 md:mb-8">
            {statCards.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} />
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {refillAlerts.length > 0 && (
                <motion.div variants={itemAnim} className={`p-5 rounded-3xl border ${
                  isLight ? 'bg-orange-50 border-orange-200' : 'bg-orange-500/10 border-orange-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className={`w-4 h-4 ${isLight ? 'text-orange-600' : 'text-orange-400'}`} />
                      <h2 className={`text-sm font-semibold ${isLight ? 'text-orange-800' : 'text-orange-300'}`}>Refill alerts</h2>
                    </div>
                    <Link to="/refills" className={`text-xs font-medium ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>View all</Link>
                  </div>
                  <div className="space-y-2">
                    {refillAlerts.slice(0, 3).map((a) => (
                      <p key={a.medicine_id} className={`text-xs ${isLight ? 'text-orange-700' : 'text-orange-200'}`}>
                        {a.alert_message}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}

              {adherence && (
                <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Adherence Progress</h2>
                      <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your weekly medication adherence</p>
                    </div>
                    <span className={`badge-emerald text-xs ${isLight ? '!bg-emerald-100 !text-emerald-700 !border-emerald-200' : ''}`}>
                      {adherence.stats?.adherence || 0}% this week
                    </span>
                  </div>
                  <AdherenceChart values={adherence.daily_adherence} labels={adherence.labels} />
                </motion.div>
              )}

              <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Today's Medicines</h2>
                    <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your medication schedule for today</p>
                  </div>
                  {pendingReminders.length > 0 && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {pendingReminders.length} due
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {reminders.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No medicines scheduled for today</p>
                  ) : (
                    reminders.map(rem => (
                      <ReminderItem key={rem.id} reminder={rem} onTaken={handleTaken} onSkipped={handleSkipped} />
                    ))
                  )}
                </div>
              </motion.div>

              <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Recent Activity</h2>
                    <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Today's medication actions</p>
                  </div>
                  <Link to="/history" className={`text-xs font-medium transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-500' : 'text-emerald-400 hover:text-emerald-300'}`}>View all</Link>
                </div>
                <div>
                  {completedReminders.length === 0 && pendingReminders.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No activity yet today</p>
                  ) : completedReminders.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No doses taken yet</p>
                  ) : (
                    completedReminders.map(rem => {
                      const timeStr = formatTime(rem.taken_datetime || rem.scheduled_datetime)
                      const statusMap = { taken: 'success', missed: 'danger', skipped: 'warning', late: 'warning' }
                      const text = rem.status === 'taken' ? `Took ${rem.medicine_name}` :
                        rem.status === 'late' ? `Took ${rem.medicine_name} (late)` :
                        rem.status === 'missed' ? `Missed ${rem.medicine_name}` :
                        rem.status === 'skipped' ? `Skipped ${rem.medicine_name}` :
                        `${rem.medicine_name} - ${rem.status}`
                      return <TimelineItem key={rem.id} time={timeStr} text={text} status={statusMap[rem.status] || 'info'} />
                    })
                  )}
                </div>
              </motion.div>
            </div>

            <div className="space-y-6">
              {nextReminder ? (
                <NextMedicineCard reminder={nextReminder} onTaken={handleTaken} onSkipped={handleSkipped} />
              ) : (
                <div className={`p-5 md:p-6 rounded-3xl border text-center ${
                  isLight ? 'bg-white border-navy-100' : 'glass-card'
                }`}>
                  <Clock className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
                  <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No more medicines scheduled for today</p>
                </div>
              )}

              {adherence?.stats && (
                <motion.div variants={itemAnim} className={`${isLight ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl border border-emerald-200 p-5 md:p-6' : 'glass-card p-5 md:p-6'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-base font-semibold ${isLight ? 'text-emerald-800' : 'text-white/90'}`}>Health Score</h2>
                    <HeartPulse className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  </div>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative">
                      <svg width="140" height="140" className="transform -rotate-90">
                        <circle cx="70" cy="70" r="60" fill="none" stroke={isLight ? '#E8EDF5' : 'rgba(255,255,255,0.06)'} strokeWidth="10" />
                        <motion.circle
                          cx="70" cy="70" r="60" fill="none"
                          stroke="url(#healthGradient)" strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 60}
                          initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - (adherence.stats.adherence || 0) / 100) }}
                          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        />
                        <defs>
                          <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22C55E" />
                            <stop offset="100%" stopColor="#22D3EE" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className={`text-3xl font-bold ${isLight ? 'text-emerald-700' : 'text-white'}`}>{adherence.stats.adherence}</p>
                          <p className={`text-xs ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>/100</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-xs ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Weekly adherence</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
                <h2 className={`text-base font-semibold mb-4 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Quick Actions</h2>
                <div className="space-y-1">
                  {quickActions.map((action, i) => (
                    <QuickAction key={action.label} {...action} index={i} />
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={itemAnim}
                className={`${isLight ? 'bg-gradient-to-br from-violet-50 to-pink-50 rounded-3xl border border-violet-200 p-5 md:p-6' : 'glass-card p-5 md:p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/5 border-violet-500/20'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400'}`}>
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>AI Insight</h2>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-navy-500' : 'text-white/50'}`}>
                  {adherence?.stats?.adherence >= 80
                    ? 'Great adherence this week! Keep up the consistent routine.'
                    : adherence?.stats?.adherence >= 50
                      ? 'Your adherence is improving. Try to maintain a consistent schedule.'
                      : 'Start tracking your medications to see AI insights about your adherence.'}
                </p>
                <div className={`mt-3 pt-3 border-t ${isLight ? 'border-violet-200' : 'border-white/[0.06]'}`}>
                  <Link to="/ai-assistant" className={`text-xs font-medium transition-colors flex items-center gap-1 ${isLight ? 'text-violet-600 hover:text-violet-500' : 'text-violet-400 hover:text-violet-300'}`}>
                    Ask AI Assistant <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
