import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, BellRing, Check, X, Clock, Timer, ChevronRight, AlarmClock, AlertCircle,
  PartyPopper, Volume2, VolumeX, Pill,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { reminderSoundOptions } from '../data'
import API from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

function parseTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Due now'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const ON_TIME_WINDOW_MS = 5 * 60 * 1000
const MISSED_CUTOFF_MS = 10 * 60 * 1000

function doseTiming(reminder, nowMs) {
  const scheduled = new Date(reminder.scheduled_datetime).getTime()
  const snoozedUntil = reminder.snoozed_until ? new Date(reminder.snoozed_until).getTime() : null
  const base = snoozedUntil && snoozedUntil > scheduled ? snoozedUntil : scheduled
  const onTimeEnd = base + ON_TIME_WINDOW_MS
  const deadline = base + MISSED_CUTOFF_MS
  let stage = 'upcoming'
  if (nowMs >= deadline) stage = 'expired'
  else if (nowMs >= onTimeEnd) stage = 'late'
  else if (nowMs >= scheduled) stage = 'window'
  return { scheduled, base, onTimeEnd, deadline, stage, snoozed: !!snoozedUntil }
}

function timingLabel(timing, nowMs) {
  const { scheduled, onTimeEnd, deadline, stage } = timing
  if (stage === 'upcoming') return { text: `in ${formatCountdown(scheduled - nowMs)}`, tone: 'emerald' }
  if (stage === 'window') return { text: `Take now · ${formatCountdown(onTimeEnd - nowMs)} left to be on time`, tone: 'emerald' }
  if (stage === 'late') return { text: `Late · misses in ${formatCountdown(deadline - nowMs)}`, tone: 'orange' }
  return { text: 'Missed cutoff passed', tone: 'red' }
}

function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const opts = reminderSoundOptions[1]
    const { freq, duration } = opts.tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.05)
  } catch {
    /* audio unavailable */
  }
}

function showNotification(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' })
    }
  } catch {
    /* notifications unavailable */
  }
}

function StatusBadge({ status }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const map = {
    pending: isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/20 text-amber-400',
    taken: isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400',
    late: isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/20 text-orange-400',
    missed: isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400',
    skipped: isLight ? 'bg-navy-100 text-navy-500' : 'bg-white/[0.08] text-white/50',
    snoozed: isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[status] || map.pending}`}>
      {status === 'late' ? 'Late' : status === 'snoozed' ? 'Snoozed' : status}
    </span>
  )
}

function ReminderRow({ reminder, now, onTake, onSnooze, onSkip }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const nowMs = now.getTime()
  const timing = doseTiming(reminder, nowMs)
  const dueNow = reminder.status === 'pending' && timing.stage !== 'upcoming'
  const label = timingLabel(timing, nowMs)
  const toneStyles = {
    emerald: isLight ? 'text-emerald-600' : 'text-emerald-400',
    orange: isLight ? 'text-orange-600' : 'text-orange-400',
    red: isLight ? 'text-red-600' : 'text-red-400',
  }
  const cardTone = {
    emerald: isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/[0.08] border-emerald-500/25',
    orange: isLight ? 'bg-orange-50 border-orange-200' : 'bg-orange-500/10 border-orange-500/30',
    red: isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30',
  }

  return (
    <motion.div
      layout
      variants={itemAnim}
      className={`p-4 rounded-3xl border transition-colors ${
        isLight
          ? dueNow ? cardTone[label.tone] : 'bg-white border-navy-100 shadow-sm'
          : dueNow ? cardTone[label.tone] : 'glass-card'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${
          dueNow
            ? label.tone === 'emerald'
              ? isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
              : label.tone === 'orange'
                ? isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/20 text-orange-400'
                : isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400'
            : isLight ? 'bg-primary-50 text-primary-600' : 'bg-primary-500/20 text-primary-400'
        }`}>
          {reminder.status === 'taken' ? <Check className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
              {reminder.medicine_name || 'Medicine'}
              <span className={`ml-2 text-xs font-normal ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                {reminder.dosage ? `${reminder.dosage}${reminder.dosage_unit || ''}` : ''}
              </span>
            </p>
            <StatusBadge status={reminder.status} />
          </div>
          <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            <Clock className="w-3 h-3" /> {parseTime(reminder.scheduled_datetime)}
            {reminder.status === 'pending' && (
              <span className={`font-semibold ${toneStyles[label.tone] || (isLight ? 'text-emerald-600' : 'text-emerald-400')}`}>
                · {dueNow ? label.text : `in ${formatCountdown(timing.scheduled - nowMs)}`}
              </span>
            )}
          </p>
          {dueNow && reminder.status === 'pending' && (
            <p className={`text-[11px] mt-1 ${isLight ? 'text-navy-400' : 'text-white/35'}`}>
              On time within 5 minutes of {parseTime(reminder.scheduled_datetime)}
              {timing.snoozed ? ' (snoozed — deadline extended)' : ''}; missed after 10 minutes.
            </p>
          )}
        </div>
      </div>

      {reminder.status === 'pending' && (
        <div className="flex gap-2 mt-3.5">
          <button
            type="button"
            onClick={() => onTake(reminder)}
            className="flex-1 flex items-center justify-center gap-1.5 btn-primary !py-2.5 !text-xs"
          >
            <Check className="w-3.5 h-3.5" /> Take Now
          </button>
          <button
            type="button"
            onClick={() => onSnooze(reminder, 5)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
              isLight ? 'bg-navy-50 text-navy-600 hover:bg-navy-100' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5" /> 5m
          </button>
          <button
            type="button"
            onClick={() => onSnooze(reminder, 10)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
              isLight ? 'bg-navy-50 text-navy-600 hover:bg-navy-100' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5" /> 10m
          </button>
          <button
            type="button"
            onClick={() => onSnooze(reminder, 15)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
              isLight ? 'bg-navy-50 text-navy-600 hover:bg-navy-100' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5" /> 15m
          </button>
          <button
            type="button"
            onClick={() => onSkip(reminder)}
            title="Skip this dose"
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
              isLight ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function NextUpCard({ next, now }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  if (!next) return null
  const nowMs = now.getTime()
  const timing = doseTiming(next, nowMs)
  const dueNow = timing.stage !== 'upcoming'
  const label = timingLabel(timing, nowMs)
  const toneText = {
    emerald: isLight ? 'text-emerald-600' : 'text-emerald-400',
    orange: isLight ? 'text-orange-600' : 'text-orange-400',
    red: isLight ? 'text-red-600' : 'text-red-400',
  }
  return (
    <motion.div variants={itemAnim} className={`p-6 rounded-3xl border overflow-hidden relative ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 blur-2xl" />
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-primary-100 text-primary-600' : 'bg-primary-500/20 text-primary-400'}`}>
          <Timer className="w-4 h-4" />
        </div>
        <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
          {dueNow ? (timing.stage === 'window' ? 'Take It Now' : 'Hurry — Still Time') : 'Next Up'}
        </h2>
      </div>
      <div className="flex items-end gap-3">
        <p className={`text-4xl font-bold tabular-nums ${toneText[label.tone]}`}>
          {dueNow ? formatCountdown(timing.deadline - nowMs) : formatCountdown(timing.scheduled - nowMs)}
        </p>
        <div className="pb-1.5">
          <p className={`text-sm font-semibold ${isLight ? 'text-navy-600' : 'text-white/80'}`}>
            {next.medicine_name}
          </p>
          <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            {parseTime(next.scheduled_datetime)} · {next.dosage ? `${next.dosage}${next.dosage_unit || ''}` : '1 dose'}
          </p>
        </div>
      </div>
      {dueNow && (
        <div className={`mt-4 flex flex-col gap-1 text-xs font-medium ${toneText[label.tone]}`}>
          <span className="flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 animate-pulse" />
            {timing.stage === 'window'
              ? 'Within the 5-minute on-time window — taking now keeps you on time.'
              : 'Past the on-time window — take before the 10-minute cutoff to avoid a missed dose.'}
          </span>
          <span className={`${isLight ? 'text-navy-400' : 'text-white/35'} font-normal`}>
            Countdown is time left until the dose is counted as missed.
          </span>
        </div>
      )}
      {!dueNow && (
        <p className={`mt-4 text-xs ${isLight ? 'text-navy-400' : 'text-white/35'}`}>
          On time within 5 minutes of {parseTime(next.scheduled_datetime)} · missed after 10 minutes.
        </p>
      )}
    </motion.div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colors = {
    emerald: { light: 'bg-emerald-100 text-emerald-600', dark: 'bg-emerald-500/20 text-emerald-400' },
    red: { light: 'bg-red-100 text-red-600', dark: 'bg-red-500/20 text-red-400' },
    amber: { light: 'bg-amber-100 text-amber-600', dark: 'bg-amber-500/20 text-amber-400' },
    orange: { light: 'bg-orange-100 text-orange-600', dark: 'bg-orange-500/20 text-orange-400' },
  }
  return (
    <motion.div variants={itemAnim} className={`p-4 rounded-3xl border ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-3 ${isLight ? colors[color].light : colors[color].dark}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-[11px] mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{label}</p>
    </motion.div>
  )
}

export default function Reminders() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [reminders, setReminders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [now, setNow] = useState(new Date())
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const seenDue = useRef(new Set())

  const fetchToday = useCallback(async () => {
    try {
      const res = await API.get('/reminders/today')
      setReminders(res.data.reminders)
      setStats(res.data.stats)
    } catch {
      /* transient */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToday()
    const poll = setInterval(fetchToday, 20000)
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [fetchToday])

  useEffect(() => {
    if (!soundOn) return
    const due = reminders.filter((r) => {
      if (r.status !== 'pending') return false
      const t = new Date(r.scheduled_datetime).getTime()
      return t <= now.getTime() && t > now.getTime() - 90000
    })
    for (const r of due) {
      if (seenDue.current.has(r.id)) continue
      seenDue.current.add(r.id)
      playTone()
      showNotification('Time for your medicine', `${r.medicine_name} — ${parseTime(r.scheduled_datetime)}`)
    }
  }, [reminders, now, soundOn])

  const requestPermission = async () => {
    try {
      const res = await Notification.requestPermission()
      setPermission(res)
    } catch {
      /* denied */
    }
  }

  const take = async (r) => {
    await API.post(`/reminders/${r.id}/taken`)
    window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    await fetchToday()
  }

  const snooze = async (r, minutes) => {
    await API.post(`/reminders/${r.id}/snoozed`, { minutes })
    await fetchToday()
  }

  const skip = async (r) => {
    await API.post(`/reminders/${r.id}/skipped`)
    window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    await fetchToday()
  }

  const groups = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime))
    const next = sorted.find((r) => r.status === 'pending')
    return {
      pending: sorted.filter((r) => r.status === 'pending'),
      taken: sorted.filter((r) => r.status === 'taken' || r.status === 'late'),
      missed: sorted.filter((r) => r.status === 'missed' || r.status === 'skipped'),
      next,
    }
  }, [reminders, now])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
      <motion.div variants={itemAnim} className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
            Smart <span className="text-gradient">Reminders</span>
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            Today's doses — take on time, snooze when you need, and never miss a dose.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setSoundOn(!soundOn); if (soundOn) playTone() }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium transition-colors ${
            isLight
              ? soundOn ? 'bg-primary-50 text-primary-600' : 'bg-navy-50 text-navy-400'
              : soundOn ? 'bg-primary-500/20 text-primary-400' : 'bg-white/[0.06] text-white/40'
          }`}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          Sound {soundOn ? 'On' : 'Off'}
        </button>
      </motion.div>

      {permission === 'default' && (
        <motion.div variants={itemAnim} className={`mb-6 p-4 rounded-3xl border flex items-center justify-between gap-3 flex-wrap ${
          isLight ? 'bg-cyan-50 border-cyan-200' : 'bg-cyan-500/10 border-cyan-500/20'
        }`}>
          <p className={`text-sm flex items-center gap-2 ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
            <Bell className="w-4 h-4" /> Enable browser notifications for instant dose alerts.
          </p>
          <button type="button" onClick={requestPermission} className="btn-primary !py-2 !text-xs">
            Enable Notifications
          </button>
        </motion.div>
      )}

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className={`skeleton h-44 lg:col-span-2 ${isLight ? '!bg-navy-100' : ''}`} />
          <div className={`skeleton h-44 ${isLight ? '!bg-navy-100' : ''}`} />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Doses Today" value={stats?.total || 0} icon={BellRing} color="emerald" />
            <StatCard label="Taken" value={stats?.taken || 0} icon={Check} color="emerald" />
            <StatCard label="Pending" value={stats?.pending || 0} icon={Timer} color="amber" />
            <StatCard label="Missed / Late" value={(stats?.missed || 0) + (stats?.late || 0)} icon={AlertCircle} color="red" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <NextUpCard next={groups.next} now={now} />
            </div>
            <motion.div variants={itemAnim} className={`p-5 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <PartyPopper className="w-4 h-4" />
                </div>
                <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Adherence Today</h2>
              </div>
              <p className={`text-4xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
                {Math.round(((stats?.taken || 0) / Math.max(stats?.total || 0, 1)) * 100)}%
              </p>
              <div className={`h-2.5 rounded-full overflow-hidden mt-3 ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((stats?.taken || 0) / Math.max(stats?.total || 0, 1)) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                />
              </div>
              <p className={`text-[11px] mt-3 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                {stats?.taken || 0} of {stats?.total || 0} doses completed on time today.
              </p>
            </motion.div>
          </div>

          <motion.div variants={itemAnim} className={`rounded-3xl border ${
            isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
          } p-5 md:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Today's Timeline</h2>
                <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                  {groups.pending.length} upcoming · {groups.taken.length} completed · {groups.missed.length} missed
                </p>
              </div>
              <ChevronRight className={`w-5 h-5 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
            </div>
            {reminders.length === 0 ? (
              <div className={`text-center py-10 ${isLight ? 'text-navy-300' : 'text-white/25'}`}>
                <BellRing className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No reminders for today. Add a medicine to get started.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-3">
                {reminders.map((r) => (
                  <ReminderRow key={r.id} reminder={r} now={now} onTake={take} onSnooze={snooze} onSkip={skip} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  )
}