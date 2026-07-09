import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronRight, Pill, HeartPulse, CheckCircle, Sparkles, Brain, TrendingUp
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import { dashboardStats, activityTimeline, quickActions, calendarEvents, adherenceData, medicineList } from '../data'

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

const lightCardGradients = [
  'bg-white border-emerald-200',
  'bg-white border-cyan-200',
  'bg-white border-violet-200',
  'bg-white border-orange-200',
  'bg-white border-pink-200',
  'bg-white border-emerald-200',
]

const iconColors = [
  'text-emerald-400 bg-emerald-500/20',
  'text-cyan-400 bg-cyan-500/20',
  'text-violet-400 bg-violet-500/20',
  'text-orange-400 bg-orange-500/20',
  'text-pink-400 bg-pink-500/20',
  'text-emerald-400 bg-emerald-500/20',
]

const lightIconColors = [
  'text-emerald-600 bg-emerald-100',
  'text-cyan-600 bg-cyan-100',
  'text-violet-600 bg-violet-100',
  'text-orange-600 bg-orange-100',
  'text-pink-600 bg-pink-100',
  'text-emerald-600 bg-emerald-100',
]

function StatCard({ label, value, sub, icon: Icon, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.div
      variants={itemAnim}
      className={`${isLight ? lightCardGradients[index % lightCardGradients.length] : `bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`} ${
        isLight ? 'rounded-3xl shadow-sm hover:shadow-md' : 'glass-card-hover'
      } p-5 transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isLight ? lightIconColors[index % lightIconColors.length] : iconColors[index % iconColors.length]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{sub}</p>
    </motion.div>
  )
}

function TimelineItem({ time, text, status, icon: Icon, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colors = {
    success: `bg-emerald-500 ${!isLight ? 'shadow-glow-emerald' : ''}`,
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
  }
  return (
    <div className={`flex items-start gap-3 py-2.5 group ${isLight ? '' : ''}`}>
      <div className="relative flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full ${colors[status]} mt-2`} />
        {index < activityTimeline.length - 1 && <div className={`w-px h-full mt-1 ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm transition-colors ${isLight ? 'text-navy-600 group-hover:text-navy-800' : 'text-white/70 group-hover:text-white/90'}`}>{text}</p>
        <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{time}</p>
      </div>
    </div>
  )
}

function CircularProgress({ value, size = 100, strokeWidth = 8 }) {
  const { theme } = useTheme()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme === 'light' ? '#E8EDF5' : 'rgba(255,255,255,0.06)'} strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="url(#adherenceGradient)" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <defs>
        <linearGradient id="adherenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function AdherenceChart() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const maxVal = Math.max(...adherenceData.weekly)
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {adherenceData.weekly.map((val, i) => {
        const height = (val / 100) * 100
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
            <span className={`text-[10px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{adherenceData.labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function CalendarWidget() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [weekOffset, setWeekOffset] = useState(0)
  const events = calendarEvents

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>This Week</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className={`p-1.5 rounded-xl transition-colors ${isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.06]'}`}>
            <ChevronRight className={`w-4 h-4 rotate-180 ${isLight ? 'text-navy-400' : 'text-white/30'}`} />
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className={`p-1.5 rounded-xl transition-colors ${isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.06]'}`}>
            <ChevronRight className={`w-4 h-4 ${isLight ? 'text-navy-400' : 'text-white/30'}`} />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {events.map((day, idx) => (
          <div key={day.date} className={`flex items-start gap-3 p-2.5 rounded-2xl transition-colors ${isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.04]'}`}>
            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${idx === 0 ? (isLight ? 'bg-emerald-100 border border-emerald-200' : 'bg-emerald-500/20 border border-emerald-500/30') : (isLight ? 'bg-navy-50' : 'bg-white/[0.04]')}`}>
              <span className={`text-[10px] font-medium leading-none ${idx === 0 ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-navy-400' : 'text-white/30')}`}>{day.date.split(' ')[0]}</span>
              <span className={`text-sm font-bold leading-none mt-0.5 ${idx === 0 ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-navy-600' : 'text-white/70')}`}>{day.date.split(' ')[1]}</span>
            </div>
            <div className="flex-1 min-w-0">
              {day.meds.map((med) => (
                <p key={med} className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/60'}`}>{med}</p>
              ))}
            </div>
            {idx === 0 && (
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${!isLight ? 'shadow-glow-emerald' : ''} mt-2`} />
            )}
          </div>
        ))}
      </div>
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
      <span className={`text-sm font-medium transition-colors ${isLight ? 'text-navy-500 group-hover:text-navy-700' : 'text-white/60 group-hover:text-white/90'}`}>{label}</span>
      <ChevronRight className={`w-4 h-4 ml-auto transition-colors ${isLight ? 'text-navy-300 group-hover:text-navy-500' : 'text-white/20 group-hover:text-white/40'}`} />
    </Link>
  )
}

function MedicineTimeline() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const now = new Date()
  const hours = now.getHours()
  const todayMeds = medicineList.slice(0, 4)
  return (
    <div className="space-y-3">
      {todayMeds.map((med, i) => {
        const medHour = parseInt(med.time.split(':')[0])
        const isPast = medHour < hours
        const isNow = medHour === hours
        return (
          <div key={med.id} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
            isNow ? (isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/20') :
            isPast ? (isLight ? 'bg-navy-50 opacity-60' : 'bg-white/[0.03] opacity-60') :
            (isLight ? 'bg-white' : 'bg-white/[0.04]')
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isNow ? 'bg-emerald-500 text-white' : isPast ? (isLight ? 'bg-navy-100 text-navy-400' : 'bg-white/[0.06] text-white/40') : (isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400')
            }`}>
              <Pill className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{med.name} <span className={isLight ? 'text-navy-400' : 'text-white/40'}>{med.dose}</span></p>
              <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{med.time}</p>
            </div>
            {isNow && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'}`}>Now</span>}
            {isPast && <CheckCircle className={`w-4 h-4 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

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
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className={`w-6 h-6 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={itemAnim} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 md:mb-8">
        {dashboardStats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Adherence Progress</h2>
                <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your weekly medication adherence</p>
              </div>
              <span className={`badge-emerald text-xs ${isLight ? '!bg-emerald-100 !text-emerald-700 !border-emerald-200' : ''}`}>+2% this week</span>
            </div>
            <AdherenceChart />
          </motion.div>

          <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Today's Medicines</h2>
                <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your medication schedule for today</p>
              </div>
              <Link to="/add-medicine" className={`text-xs font-medium transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-500' : 'text-emerald-400 hover:text-emerald-300'}`}>Manage</Link>
            </div>
            <MedicineTimeline />
          </motion.div>

          <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-base font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Recent Activity</h2>
                <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your latest medication actions</p>
              </div>
              <Link to="/history" className={`text-xs font-medium transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-500' : 'text-emerald-400 hover:text-emerald-300'}`}>View all</Link>
            </div>
            <div>
              {activityTimeline.map((item, i) => (
                <TimelineItem key={i} {...item} index={i} />
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div variants={itemAnim} className={`${isLight ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl border border-emerald-200 p-5 md:p-6' : 'glass-card p-5 md:p-6'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-base font-semibold ${isLight ? 'text-emerald-800' : 'text-white/90'}`}>Health Score</h2>
              <HeartPulse className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            </div>
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <CircularProgress value={87} size={140} strokeWidth={10} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${isLight ? 'text-emerald-700' : 'text-white'}`}>87</p>
                    <p className={`text-xs ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>/100</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span className={`text-xs ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>+3% this week</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
            <h2 className={`text-base font-semibold mb-4 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Quick Actions</h2>
            <div className="space-y-1">
              {quickActions.map((action, i) => (
                <QuickAction key={action.label} {...action} index={i} />
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemAnim} className={`${isLight ? 'bg-white rounded-3xl shadow-sm border border-navy-100' : 'glass-card'} p-5 md:p-6`}>
            <CalendarWidget />
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
              Your adherence has improved 12% this month. Keep up the great work! Consider setting a reminder for your Vitamin D dose.
            </p>
            <div className={`mt-3 pt-3 border-t ${isLight ? 'border-violet-200' : 'border-white/[0.06]'}`}>
              <Link to="/ai-assistant" className={`text-xs font-medium transition-colors flex items-center gap-1 ${isLight ? 'text-violet-600 hover:text-violet-500' : 'text-violet-400 hover:text-violet-300'}`}>
                Ask AI Assistant <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
