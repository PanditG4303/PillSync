import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarCheck, Pill, AlertTriangle,
  Target, BarChart3, LineChart, XCircle, Clock,
  Share2, Copy, Check, Trash2, Sparkles, Sun, Sunrise, Sunset, Moon,
  Stethoscope, Printer, HeartPulse, Salad,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import API from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const windowMeta = {
  Morning: { icon: Sunrise, color: 'amber' },
  Afternoon: { icon: Sun, color: 'cyan' },
  Evening: { icon: Sunset, color: 'violet' },
  Night: { icon: Moon, color: 'blue' },
}

function StatCard({ label, value, icon: Icon, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const bgColors = isLight ? [
    'bg-white border-emerald-200',
    'bg-white border-cyan-200',
    'bg-white border-violet-200',
    'bg-white border-orange-200',
    'bg-white border-pink-200',
    'bg-white border-emerald-200',
  ] : [
    'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
    'from-violet-500/20 to-violet-500/5 border-violet-500/20',
    'from-orange-500/20 to-orange-500/5 border-orange-500/20',
    'from-pink-500/20 to-pink-500/5 border-pink-500/20',
    'from-emerald-500/20 to-cyan-500/5 border-emerald-500/20',
  ]

  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 rounded-3xl transition-all duration-300 ${
        isLight
          ? `${bgColors[index % bgColors.length]} border shadow-sm hover:shadow-md`
          : `glass-card-hover bg-gradient-to-br ${bgColors[index % bgColors.length]}`
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
          isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{label}</p>
    </motion.div>
  )
}

function UsageBar({ day, value, max, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const height = max > 0 ? (value / max) * 100 : 0
  const isHigh = height >= 80
  const isMid = height >= 50
  const gradient = isHigh ? 'from-emerald-400 to-emerald-500' : isMid ? 'from-orange-400 to-orange-500' : 'from-red-400 to-red-500'
  const glow = isHigh && !isLight ? 'shadow-glow-emerald' : ''
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <motion.div
        initial={{ height: 0 }}
        whileInView={{ height: `${Math.max(height, 5)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.08 }}
        className={`w-full rounded-lg bg-gradient-to-t ${gradient} ${glow}`}
        style={{ maxHeight: '120px', minHeight: '16px' }}
      />
      <span className={`text-[10px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{day}</span>
    </div>
  )
}

function AiSummaryText({ text, isLight }) {
  const renderLine = (line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h3 key={i} className={`text-sm font-semibold mt-5 mb-2 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
          {line.replace(/^##\s*/, '')}
        </h3>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} className={`text-sm leading-relaxed ml-4 list-disc ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
          {line.slice(2).replace(/\*\*(.+?)\*\*/g, (_, t) => (
            <strong key={t} className="text-emerald-500">{t}</strong>
          ))}
        </li>
      )
    }
    if (line.trim()) {
      return (
        <p key={i} className={`text-sm leading-relaxed ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
          {line.replace(/\*\*(.+?)\*\*/g, (_, t) => (
            <strong key={t} className="text-emerald-500">{t}</strong>
          ))}
        </p>
      )
    }
    return <div key={i} className="h-2" />
  }
  return <div className="space-y-1">{text.split('\n').map(renderLine)}</div>
}

export default function Reports() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('week')

  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [trends, setTrends] = useState(null)
  const [trendsLoading, setTrendsLoading] = useState(true)

  const [shares, setShares] = useState([])
  const [sharesLoading, setSharesLoading] = useState(true)
  const [shareTitle, setShareTitle] = useState('')
  const [shareScope, setShareScope] = useState('external')
  const [shareExternal, setShareExternal] = useState(true)
  const [shareMsg, setShareMsg] = useState(null)
  const [copied, setCopied] = useState(null)
  const [showEmbed, setShowEmbed] = useState(null)

  const fetchShares = useCallback(async () => {
    try {
      const res = await API.get('/reports/shares')
      setShares(res.data.shares || [])
    } catch {
      setShares([])
    } finally {
      setSharesLoading(false)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await API.get(`/reports/adherence?period=${period}`)
        setData(res.data)
      } catch {
        setData(null)
        setError('Could not load adherence report. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period])

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await API.get('/reports/summary')
        setSummary(res.data)
      } catch {
        setSummary(null)
      } finally {
        setSummaryLoading(false)
      }
    }
    fetchSummary()
    fetchShares()
    Promise.allSettled([
      API.get('/health/summary?days=7'),
      API.get('/nutrition/summary?days=7'),
    ]).then(([healthRes, nutritionRes]) => {
      setTrends({
        health: healthRes.status === 'fulfilled' ? healthRes.value.data : null,
        nutrition: nutritionRes.status === 'fulfilled' ? nutritionRes.value.data : null,
      })
    }).finally(() => setTrendsLoading(false))
  }, [fetchShares])

  const stats = data?.stats ? [
    { label: period === 'day' ? 'Today\'s Adherence' : period === 'month' ? 'Monthly Adherence' : 'Weekly Adherence', value: `${data.stats.adherence}%`, icon: Target },
    { label: 'Total Scheduled Doses', value: data.stats.total_scheduled.toString(), icon: CalendarCheck },
    { label: 'Taken', value: data.stats.taken.toString(), icon: Pill },
    { label: 'Missed', value: data.stats.missed.toString(), icon: AlertTriangle },
    { label: 'Skipped', value: data.stats.skipped.toString(), icon: XCircle },
    { label: 'Pending', value: data.stats.pending.toString(), icon: Clock },
  ] : []

  const chartValues = data?.daily_adherence || []
  const chartLabels = data?.labels || []
  const displayValues = period === 'month'
    ? chartValues.filter((_, i) => i % 3 === 0 || i === chartValues.length - 1)
    : chartValues
  const displayLabels = period === 'month'
    ? chartLabels.filter((_, i) => i % 3 === 0 || i === chartLabels.length - 1)
    : chartLabels

  const windows = data?.dose_windows || {}
  const perMedicine = data?.per_medicine || []
  const expected = data?.expected_vs_taken || {}
  const windowEntries = Object.entries(windows)
  const windowMax = Math.max(1, ...windowEntries.map(([, v]) => v.scheduled || 0))

  const createShare = async () => {
    setShareMsg(null)
    try {
      const res = await API.post('/reports/shares', {
        title: shareTitle,
        scope: shareScope,
        external: shareExternal,
      })
      setCopied(res.data.share.link)
      const link = res.data.share.link
      setShareMsg({ type: 'success', text: 'Share link created.', link })
      fetchShares()
      setShareTitle('')
    } catch (err) {
      setShareMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create share link.' })
    }
  }

  const revokeShare = async (id) => {
    try {
      await API.delete(`/reports/shares/${id}`)
      fetchShares()
    } catch {}
  }

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {}
  }

  const periodTitle = period === 'day' ? 'Daily Adherence Report' : period === 'month' ? 'Monthly Adherence Report' : 'Weekly Adherence Report'
  const periodDescription = `Tracked ${stats[0]?.value || '—'} adherence across ${data?.stats?.total_scheduled || 0} scheduled dose(s) this ${period}.`

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={itemAnim} className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Reports</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{periodDescription}</p>
          </div>
          <div className={`flex rounded-2xl p-1 border ${isLight ? 'bg-navy-50 border-navy-100' : 'bg-white/[0.04] border-white/[0.08]'}`}>
            {['day', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium capitalize ${
                  period === p
                    ? (isLight ? 'bg-white text-navy-700 shadow-sm' : 'bg-emerald-500/20 text-emerald-400')
                    : (isLight ? 'text-navy-400' : 'text-white/40')
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium border transition-colors ${
              isLight
                ? 'bg-white border-navy-200 text-navy-600 hover:bg-navy-50'
                : 'bg-white/[0.05] border-white/[0.1] text-white/70 hover:bg-white/[0.1]'
            }`}
            title="Print or save this report as PDF"
          >
            <Printer className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <motion.div variants={itemAnim} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className={`skeleton h-28 ${isLight ? '!bg-navy-100' : ''}`} />)}
        </motion.div>
      ) : !data ? (
        <motion.div variants={itemAnim} className={`p-10 text-center rounded-3xl border ${isLight ? 'bg-white border-navy-100' : 'glass-card'}`}>
          <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No report data available yet. Start tracking medicines to see reports.</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemAnim} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 md:mb-8">
            {stats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} index={i} />
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{periodTitle} · Breakdown</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Overall Adherence</span>
                    <span className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.stats.adherence}%</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${data.stats.adherence}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Expected vs Taken</span>
                    <span className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>
                      {expected.taken}/{expected.expected}
                      {expected.difference > 0 && (
                        <span className={`ml-1.5 text-xs ${isLight ? 'text-orange-500' : 'text-orange-400'}`}>
                          ({expected.difference} behind)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${expected.expected > 0 ? (expected.taken / expected.expected) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Missed Rate</span>
                    <span className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.stats.missed}/{data.stats.total_scheduled}</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${data.stats.total_scheduled > 0 ? (data.stats.missed / data.stats.total_scheduled) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <LineChart className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Daily Adherence Trend</h2>
              </div>
              <div className="flex items-end gap-2 h-48 pt-4 overflow-x-auto">
                {displayValues.map((val, i) => (
                  <UsageBar key={i} day={displayLabels[i]} value={val} max={100} index={i} />
                ))}
              </div>
              <div className={`mt-4 pt-4 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'} grid grid-cols-3 gap-4 text-center text-xs`}>
                <div>
                  <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Best Day</p>
                  <p className={`font-semibold mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {chartValues.length
                      ? `${chartLabels[chartValues.indexOf(Math.max(...chartValues))]} (${Math.max(...chartValues)}%)`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Average</p>
                  <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>
                    {chartValues.length
                      ? `${(chartValues.reduce((a, b) => a + b, 0) / chartValues.length).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Total Doses</p>
                  <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.stats.taken}/{data.stats.total_scheduled}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {windowEntries.length > 0 && (
            <motion.div variants={itemAnim} className={`mt-6 p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className={`w-5 h-5 ${isLight ? 'text-violet-600' : 'text-violet-400'}`} />
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Dose Window Distribution</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {windowEntries.map(([name, v]) => {
                  const meta = windowMeta[name] || { icon: Clock, color: 'cyan' }
                  const Icon = meta.icon
                  const pct = v.scheduled > 0 ? Math.round((v.missed / v.scheduled) * 100) : 0
                  return (
                    <div key={name} className={`rounded-2xl border p-4 ${
                      isLight ? 'bg-navy-50/60 border-navy-100' : 'bg-white/[0.03] border-white/[0.06]'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${isLight ? 'text-violet-500' : 'text-violet-400'}`} />
                        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{name}</p>
                      </div>
                      <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                        {v.scheduled} scheduled · {v.taken} taken
                      </p>
                      <p className={`text-xs mt-0.5 ${pct > 30 ? 'text-orange-400' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                        {v.scheduled ? `${pct}% missed` : 'no doses scheduled'}
                      </p>
                      <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-navy-200' : 'bg-white/[0.08]'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(v.scheduled / windowMax) * 100}%` }}
                          viewport={{ once: true }}
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {perMedicine.length > 0 && (
                <>
                  <h3 className={`text-sm font-semibold mt-6 mb-3 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
                    Missed doses by medicine
                  </h3>
                  <div className="space-y-2">
                    {perMedicine.slice(0, 5).map((m) => (
                      <div key={m.name} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`truncate ${isLight ? 'text-navy-600' : 'text-white/70'}`}>{m.name}</span>
                            <span className={`shrink-0 ml-2 ${m.missed > 0 ? 'text-orange-400' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                              {m.missed} missed · {m.taken} taken
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${m.adherence}%` }}
                              viewport={{ once: true }}
                              className={`h-full rounded-full ${
                                m.adherence >= 80
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : m.adherence >= 50
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                    : 'bg-gradient-to-r from-red-500 to-red-400'
                              }`}
                            />
                          </div>
                        </div>
                        <span className={`text-xs font-medium w-10 text-right ${isLight ? 'text-navy-500' : 'text-white/40'}`}>
                          {m.adherence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {!trendsLoading && trends && (trends.health?.trends || trends.nutrition) && (
            <motion.div variants={itemAnim} className={`mt-6 p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className={`w-5 h-5 ${isLight ? 'text-pink-600' : 'text-pink-400'}`} />
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Health & Nutrition Trends</h2>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto ${
                  isLight ? 'bg-pink-100 text-pink-700' : 'bg-pink-500/20 text-pink-400'
                }`}>Last 7 days</span>
              </div>

              {trends.health?.trends && Object.keys(trends.health.trends).length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  {Object.entries(trends.health.trends).slice(0, 8).map(([type, values]) => {
                    const labels = { weight: 'Weight', blood_pressure: 'Blood Pressure', sugar_level: 'Sugar', heart_rate: 'Heart Rate', blood_oxygen: 'Oxygen', temperature: 'Temp', sleep_hours: 'Sleep', water_intake: 'Water', daily_steps: 'Steps', mood: 'Mood' }
                    const units = { weight: 'kg', blood_pressure: 'mmHg', sugar_level: 'mg/dL', heart_rate: 'bpm', blood_oxygen: '%', temperature: '°C', sleep_hours: 'hrs', water_intake: 'ml', daily_steps: 'steps', mood: '/5' }
                    const latest = values[values.length - 1]
                    if (!latest) return null
                    return (
                      <div key={type} className={`rounded-2xl border p-3.5 ${
                        isLight ? 'bg-navy-50/60 border-navy-100' : 'bg-white/[0.03] border-white/[0.06]'
                      }`}>
                        <p className={`text-[11px] font-medium ${isLight ? 'text-navy-500' : 'text-white/60'}`}>
                          {labels[type] || type}
                        </p>
                        <p className={`text-lg font-bold mt-0.5 ${isLight ? 'text-navy-800' : 'text-white'}`}>
                          {latest.value_text || latest.value} <span className={`text-[10px] font-normal ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{units[type] || ''}</span>
                        </p>
                        <div className="flex items-end gap-0.5 h-8 mt-2">
                          {values.slice(-7).map((v, i) => {
                            const max = Math.max(...values.slice(-7).map((x) => x.value), 1)
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-sm bg-gradient-to-t from-pink-400 to-cyan-400"
                                style={{ height: `${Math.max((v.value / max) * 100, 8)}%` }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {trends.nutrition?.labels && (
                <div className="grid sm:grid-cols-3 gap-5">
                  {[
                    { label: 'Calories (kcal)', values: trends.nutrition.calories_series || [], color: 'bg-gradient-to-t from-orange-400 to-orange-500' },
                    { label: 'Protein (g)', values: trends.nutrition.protein_series || [], color: 'bg-gradient-to-t from-pink-400 to-pink-500' },
                    { label: 'Water (ml)', values: trends.nutrition.water_series || [], color: 'bg-gradient-to-t from-cyan-400 to-cyan-500' },
                  ].map((row) => {
                    const max = Math.max(...row.values, 1)
                    return (
                      <div key={row.label}>
                        <p className={`text-[11px] font-medium mb-2 ${isLight ? 'text-navy-500' : 'text-white/60'}`}>{row.label}</p>
                        <div className="flex items-end gap-1 h-24">
                          {row.values.map((v, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-lg ${row.color}`}
                              style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
                              title={`${trends.nutrition.labels[i] || ''}: ${v}`}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {trends.nutrition?.daily_average && (
                <div className={`mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-1 text-[11px] ${isLight ? 'text-navy-400 border-navy-100' : 'text-white/30 border-white/[0.06]'}`}>
                  <span>Avg {trends.nutrition.daily_average.calories} kcal/day</span>
                  <span>Avg {trends.nutrition.daily_average.protein} g protein</span>
                  <span>Avg {trends.nutrition.daily_average.water_ml} ml water</span>
                </div>
              )}
            </motion.div>
          )}

          {!summaryLoading && summary?.summary && (
            <motion.div variants={itemAnim} className={`mt-6 p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>AI Health Summary</h2>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  summary.engine === 'ai'
                    ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                    : isLight ? 'bg-navy-100 text-navy-500' : 'bg-white/[0.06] text-white/40'
                }`}>
                  {summary.engine === 'ai' ? 'AI' : 'Rule-based fallback'}
                </span>
              </div>
              <AiSummaryText text={summary.summary} isLight={isLight} />
              <p className={`mt-4 text-[11px] ${isLight ? 'text-navy-300' : 'text-white/25'}`}>{summary.disclaimer}</p>
            </motion.div>
          )}

          {data.refill_summary && (
            <motion.div variants={itemAnim} className={`mt-6 p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <h2 className={`text-base font-semibold mb-3 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Refill prediction summary</h2>
              <div className="grid sm:grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <p className={isLight ? 'text-navy-400' : 'text-white/40'}>Tracked</p>
                  <p className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.refill_summary.total_tracked}</p>
                </div>
                <div>
                  <p className={isLight ? 'text-navy-400' : 'text-white/40'}>Low stock</p>
                  <p className={`font-semibold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{data.refill_summary.low_stock_count}</p>
                </div>
                <div>
                  <p className={isLight ? 'text-navy-400' : 'text-white/40'}>Alerts</p>
                  <p className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.refill_summary.alerts?.length || 0}</p>
                </div>
              </div>
              {(data.refill_summary.alerts || []).slice(0, 3).map((a) => (
                <p key={a.medicine_id} className={`text-xs mb-1 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{a.alert_message}</p>
              ))}
            </motion.div>
          )}

          <motion.div variants={itemAnim} className={`mt-6 p-5 md:p-6 rounded-3xl border ${
            isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Share2 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Share report</h2>
            </div>
            <p className={`text-xs mb-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
              Create a link that anyone can open to view this health summary — useful for sharing with your doctor or family.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                type="text"
                value={shareTitle}
                onChange={(e) => setShareTitle(e.target.value)}
                placeholder="Title (optional)"
                className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 ${
                  isLight
                    ? 'bg-navy-50 border border-navy-200 text-navy-800 focus:ring-emerald-300'
                    : 'bg-white/[0.06] border border-white/[0.08] text-white focus:ring-emerald-500/40'
                }`}
                maxLength={120}
              />
              <select
                value={shareScope}
                onChange={(e) => setShareScope(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm ${
                  isLight
                    ? 'bg-navy-50 border border-navy-200 text-navy-700'
                    : 'bg-white/[0.06] border border-white/[0.08] text-white/70'
                }`}
              >
                <option value="external" className={isLight ? 'bg-white' : 'bg-navy-800'}>External (anyone)</option>
                <option value="patient" className={isLight ? 'bg-white' : 'bg-navy-800'}>Patients</option>
                <option value="caregiver" className={isLight ? 'bg-white' : 'bg-navy-800'}>Caregivers</option>
                <option value="admin" className={isLight ? 'bg-white' : 'bg-navy-800'}>Admins</option>
              </select>
              <button
                onClick={createShare}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                Create link
              </button>
            </div>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={shareExternal}
                onChange={(e) => setShareExternal(e.target.checked)}
                className="rounded"
              />
              <span className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                Allow External access (no login required)
              </span>
            </label>

            {shareMsg && (
              <div className={`mb-3 text-xs ${shareMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {shareMsg.text}
                {shareMsg.link && (
                  <button
                    onClick={() => copyToClipboard(shareMsg.link, 'new')}
                    className="ml-2 inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    {copied === 'new' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'new' ? 'Copied' : 'Copy link'}
                  </button>
                )}
              </div>
            )}

            {sharesLoading ? (
              <div className={`skeleton h-14 ${isLight ? '!bg-navy-100' : ''}`} />
            ) : shares.length > 0 ? (
              <div className="space-y-2">
                {shares.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${
                    isLight ? 'border-navy-100 bg-navy-50/50' : 'border-white/[0.06] bg-white/[0.03]'
                  }`}>
                    <div className="min-w-0 flex-1">
                      {s.title && (
                        <p className={`text-sm font-medium truncate ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{s.title}</p>
                      )}
                      <p className={`text-[11px] truncate ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                        {s.scope} · {s.external ? 'external access' : 'login required'} · {s.revoked ? 'revoked' : 'active'}
                      </p>
                    </div>
                    {!s.revoked && (
                      <>
                        <button
                          onClick={() => copyToClipboard(s.link, s.id)}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                            isLight
                              ? 'border-navy-200 text-navy-500 hover:bg-navy-100'
                              : 'border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                          }`}
                        >
                          {copied === s.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === s.id ? 'Copied' : 'Copy link'}
                        </button>
                        <button
                          onClick={() => setShowEmbed(showEmbed === s.id ? null : s.id)}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                            isLight
                              ? 'border-navy-200 text-navy-500 hover:bg-navy-100'
                              : 'border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                          }`}
                        >
                          {showEmbed === s.id ? <XCircle className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                          Embed
                        </button>
                        <button
                          onClick={() => revokeShare(s.id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Revoke
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>No share links yet.</p>
            )}

            {showEmbed && (
              <div className={`mt-3 rounded-2xl border p-3 ${
                isLight ? 'bg-navy-50 border-navy-100' : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <p className={`text-[11px] mb-2 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                  Embed this report in any page:
                </p>
                <code className={`block text-[11px] p-2 rounded-lg overflow-x-auto ${
                  isLight ? 'bg-white text-navy-600 border border-navy-100' : 'bg-black/40 text-emerald-300'
                }`}>
                  {`<iframe src="${shares.find((s) => s.id === showEmbed)?.embed_url || ''}" width="100%" height="640" frameborder="0"></iframe>`}
                </code>
                <button
                  onClick={() => copyToClipboard(
                    `<iframe src="${shares.find((s) => s.id === showEmbed)?.embed_url || ''}" width="100%" height="640" frameborder="0"></iframe>`,
                    `embed-${showEmbed}`,
                  )}
                  className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                    isLight ? 'text-emerald-600' : 'text-emerald-400'
                  }`}
                >
                  {copied === `embed-${showEmbed}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === `embed-${showEmbed}` ? 'Copied embed code' : 'Copy embed code'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  )
}