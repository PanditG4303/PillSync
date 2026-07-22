import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, Activity, CalendarCheck, Pill, AlertTriangle,
  HeartPulse, Target, Download, BarChart3, LineChart, XCircle, Clock,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { useAuth } from '../components/AuthContext'
import API from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
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

export default function Reports() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await API.get('/reports/adherence')
        setData(res.data)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = data?.stats ? [
    { label: 'Weekly Adherence', value: `${data.stats.adherence}%`, icon: Target },
    { label: 'Total Scheduled Doses', value: data.stats.total_scheduled.toString(), icon: CalendarCheck },
    { label: 'Taken', value: data.stats.taken.toString(), icon: Pill },
    { label: 'Missed', value: data.stats.missed.toString(), icon: AlertTriangle },
    { label: 'Skipped', value: data.stats.skipped.toString(), icon: XCircle },
    { label: 'Pending', value: data.stats.pending.toString(), icon: Clock },
  ] : []

  const maxVal = data?.daily_adherence ? Math.max(...data.daily_adherence, 1) : 100

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={itemAnim} className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Reports</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Weekly summaries and adherence analytics.</p>
          </div>
        </div>
      </motion.div>

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
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Weekly Adherence Breakdown</h2>
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
                    <span className={isLight ? 'text-navy-500' : 'text-white/60'}>Taken vs Scheduled</span>
                    <span className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{data.stats.taken}/{data.stats.total_scheduled}</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${data.stats.total_scheduled > 0 ? (data.stats.taken / data.stats.total_scheduled) * 100 : 0}%` }}
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
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Daily Adherence</h2>
              </div>
              <div className="flex items-end gap-2 h-48 pt-4">
                {data.daily_adherence.map((val, i) => (
                  <UsageBar key={i} day={data.labels[i]} value={val} max={100} index={i} />
                ))}
              </div>
              <div className={`mt-4 pt-4 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'} grid grid-cols-3 gap-4 text-center text-xs`}>
                <div>
                  <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Best Day</p>
                  <p className={`font-semibold mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {data.daily_adherence && data.labels
                      ? `${data.labels[data.daily_adherence.indexOf(Math.max(...data.daily_adherence))]} (${Math.max(...data.daily_adherence)}%)`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Average</p>
                  <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>
                    {data.daily_adherence?.length > 0
                      ? `${(data.daily_adherence.reduce((a, b) => a + b, 0) / data.daily_adherence.length).toFixed(1)}%`
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
        </>
      )}
    </motion.div>
  )
}
