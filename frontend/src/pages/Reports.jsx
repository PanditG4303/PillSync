import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Activity, CalendarCheck, Pill, AlertTriangle, HeartPulse, Target, Download, BarChart3, LineChart } from 'lucide-react'
import { reportsData, adherenceData } from '../data'
import { useTheme } from '../components/ThemeContext'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const cardGradients = [
  'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
  'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
  'from-violet-500/20 to-violet-500/5 border-violet-500/20',
  'from-orange-500/20 to-orange-500/5 border-orange-500/20',
  'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  'from-emerald-500/20 to-cyan-500/5 border-emerald-500/20',
]

function StatCard({ label, value, change, trend, icon: Icon, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const trendColors = {
    up: isLight ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-400 bg-emerald-500/20',
    down: isLight ? 'text-red-700 bg-red-100' : 'text-red-400 bg-red-500/20',
    neutral: isLight ? 'text-navy-500 bg-navy-100' : 'text-white/50 bg-white/[0.06]',
  }
  const bgColors = isLight ? [
    'bg-white border-emerald-200',
    'bg-white border-cyan-200',
    'bg-white border-violet-200',
    'bg-white border-orange-200',
    'bg-white border-pink-200',
    'bg-white border-emerald-200',
  ] : cardGradients
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 rounded-3xl transition-all duration-300 ${
        isLight
          ? `${bgColors[index % bgColors.length]} border shadow-sm hover:shadow-md`
          : `glass-card-hover bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${trend === 'up' ? (isLight ? 'bg-emerald-100' : 'bg-emerald-500/20') : trend === 'down' ? (isLight ? 'bg-red-100' : 'bg-red-500/20') : (isLight ? 'bg-navy-100' : 'bg-white/[0.06]')}`}>
          <Icon className={`w-5 h-5 ${trend === 'up' ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : trend === 'down' ? (isLight ? 'text-red-600' : 'text-red-400') : (isLight ? 'text-navy-500' : 'text-white/50')}`} />
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trendColors[trend]}`}>
          <TrendIcon className="w-3 h-3" /> {change}
        </span>
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{label}</p>
    </motion.div>
  )
}

function ProgressBar({ label, value, color }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={isLight ? 'text-navy-500' : 'text-white/60'}>{label}</span>
        <span className={`font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{value}%</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function UsageBar({ day, value, max, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const height = (value / 100) * 100
  const isHigh = value >= 90
  const isMid = value >= 75
  const gradient = isHigh ? 'from-emerald-400 to-emerald-500' : isMid ? 'from-orange-400 to-orange-500' : 'from-red-400 to-red-500'
  const glow = isHigh && !isLight ? 'shadow-glow-emerald' : ''
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <motion.div
        initial={{ height: 0 }}
        whileInView={{ height: `${height}%` }}
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

  const stats = [
    { label: 'Weekly Adherence', value: `${reportsData.weeklyAdherence.value}%`, change: reportsData.weeklyAdherence.change, trend: reportsData.weeklyAdherence.trend, icon: Target },
    { label: 'Total Doses Taken', value: reportsData.totalDoses.value, change: reportsData.totalDoses.change, trend: reportsData.totalDoses.trend, icon: Pill },
    { label: 'Missed Doses', value: reportsData.missedDoses.value, change: reportsData.missedDoses.change, trend: reportsData.missedDoses.trend, icon: AlertTriangle },
    { label: 'Current Streak', value: `${reportsData.streakDays.value} days`, change: reportsData.streakDays.change, trend: reportsData.streakDays.trend, icon: Activity },
    { label: 'Upcoming Refills', value: reportsData.upcomingRefills.value, change: reportsData.upcomingRefills.change, trend: reportsData.upcomingRefills.trend, icon: CalendarCheck },
    { label: 'AI Health Score', value: reportsData.aiScore.value, change: reportsData.aiScore.change, trend: reportsData.aiScore.trend, icon: HeartPulse },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={itemAnim} className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Reports</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Monthly summaries and adherence analytics.</p>
          </div>
          <button className={`btn-primary ${isLight ? 'shadow-md shadow-emerald-200' : ''}`}>
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </motion.div>

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
            <ProgressBar label="Overall Adherence" value={94} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <ProgressBar label="Morning Doses (8 AM)" value={100} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
            <ProgressBar label="Afternoon Doses (1 PM)" value={85} color="bg-gradient-to-r from-orange-500 to-orange-400" />
            <ProgressBar label="Evening Doses (8 PM)" value={92} color="bg-gradient-to-r from-violet-500 to-violet-400" />
          </div>
        </motion.div>

        <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
          isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <LineChart className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Medicine Usage</h2>
          </div>
          <div className="flex items-end gap-2 h-48 pt-4">
            {adherenceData.weekly.map((val, i) => (
              <UsageBar key={i} day={adherenceData.labels[i]} value={val} index={i} />
            ))}
          </div>
          <div className={`mt-4 pt-4 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'} grid grid-cols-3 gap-4 text-center text-xs`}>
            <div>
              <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Best Day</p>
              <p className={`font-semibold mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Thursday (100%)</p>
            </div>
            <div>
              <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Average</p>
              <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>92.6%</p>
            </div>
            <div>
              <p className={`${isLight ? 'text-navy-400' : 'text-white/30'}`}>Total Doses</p>
              <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>28/30</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
