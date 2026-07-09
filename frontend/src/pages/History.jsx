import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Search, CalendarDays, Pill, CheckCircle, XCircle, AlertCircle, ListFilter } from 'lucide-react'
import { dummyLogs } from '../data'
import { useTheme } from '../components/ThemeContext'
import { HealthIllustration } from '../components/illustrations'

const statusConfig = {
  Taken: { icon: CheckCircle, color: 'badge-emerald', dot: 'bg-emerald-500' },
  Missed: { icon: XCircle, color: 'badge-orange', dot: 'bg-red-500' },
  Upcoming: { icon: AlertCircle, color: 'badge-cyan', dot: 'bg-cyan-500' },
}

function HistoryCard({ date, name, dose, time, status }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const config = statusConfig[status]
  const StatusIcon = config.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-3xl transition-all duration-300 ${
        isLight
          ? 'bg-white border border-navy-100 shadow-sm hover:shadow-md'
          : 'glass-card-hover'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{name}</p>
            <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{dose}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color} ${isLight ? '!bg-navy-50 !border-navy-200' : ''}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status}
        </span>
      </div>
      <div className={`flex items-center gap-4 text-xs mt-3 pt-3 border-t ${isLight ? 'text-navy-400 border-navy-100' : 'text-white/30 border-white/[0.06]'}`}>
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {date}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time}</span>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="text-center py-16">
      <HealthIllustration className="w-32 h-32 mx-auto mb-4" />
      <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>No history yet</h3>
      <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Your medication history will appear here once you start tracking.</p>
    </div>
  )
}

export default function History() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const filtered = dummyLogs.filter((log) => {
    const matchesSearch = log.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || log.status.toLowerCase() === filter
    return matchesSearch && matchesFilter
  })

  const today = filtered.filter(l => l.date === '2026-07-08')
  const earlier = filtered.filter(l => l.date !== '2026-07-08')

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Medication History</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Track every dose you have taken.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
              <input
                type="text"
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-2xl text-sm transition-all w-40 lg:w-48 ${
                  isLight
                    ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-navy-300'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 placeholder:text-white/30'
                }`}
              />
            </div>
            <div className="relative">
              <ListFilter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`pl-9 pr-3 py-2 rounded-2xl text-sm appearance-none ${
                  isLight
                    ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
                }`}
              >
                <option value="all" className={isLight ? 'bg-white' : 'bg-navy-800'}>All Status</option>
                <option value="taken" className={isLight ? 'bg-white' : 'bg-navy-800'}>Taken</option>
                <option value="missed" className={isLight ? 'bg-white' : 'bg-navy-800'}>Missed</option>
                <option value="upcoming" className={isLight ? 'bg-white' : 'bg-navy-800'}>Upcoming</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
          <EmptyState />
        </motion.div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Today
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {today.map((log, i) => (
                  <HistoryCard key={i} {...log} />
                ))}
              </div>
            </motion.div>
          )}

          {earlier.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Earlier
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {earlier.map((log, i) => (
                  <HistoryCard key={i} {...log} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`mt-6 flex items-center justify-center gap-2 text-xs px-4 py-3 rounded-2xl border ${
          isLight ? 'bg-white border-navy-100 text-navy-400 shadow-sm' : 'glass-card text-white/30'
        }`}
      >
        <Clock className="w-3 h-3" />
        Showing logs from the last 7 days
      </motion.div>
    </div>
  )
}
