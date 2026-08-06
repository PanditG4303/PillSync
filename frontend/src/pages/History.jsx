import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Search, CalendarDays, Pill, CheckCircle, XCircle, AlertCircle, ListFilter } from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { HealthIllustration } from '../components/illustrations'
import API from '../api'
import { formatDate, formatTime, isSameLocalDay } from '../utils/datetime'

const statusConfig = {
  taken: { icon: CheckCircle, color: 'badge-emerald', dot: 'bg-emerald-500' },
  missed: { icon: XCircle, color: 'badge-orange', dot: 'bg-red-500' },
  pending: { icon: AlertCircle, color: 'badge-cyan', dot: 'bg-cyan-500' },
  skipped: { icon: XCircle, color: 'badge-neutral', dot: 'bg-white/40' },
  late: { icon: Clock, color: 'badge-orange', dot: 'bg-orange-500' },
}

function HistoryCard({ item }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const config = statusConfig[item.status] || statusConfig.pending
  const StatusIcon = config.icon

  const dateStr = formatDate(item.scheduled_datetime)
  const timeStr = formatTime(item.scheduled_datetime)
  const takenTimeStr = item.taken_datetime ? formatTime(item.taken_datetime) : null

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
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{item.medicine_name}</p>
            <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{item.dosage}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color} ${isLight ? '!bg-navy-50 !border-navy-200' : ''}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      </div>
      <div className={`flex items-center gap-4 text-xs mt-3 pt-3 border-t ${isLight ? 'text-navy-400 border-navy-100' : 'text-white/30 border-white/[0.06]'}`}>
        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dateStr}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeStr}</span>
        {takenTimeStr && (
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Taken: {takenTimeStr}</span>
        )}
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
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const timeFilterLabels = [
    { value: 'all', label: 'All History' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
  ]

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await API.get(`/reminders/history?filter=${filter}`)
      setRecords(res.data || [])
    } catch {
      setRecords([])
      setError('Could not load history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [filter])

  const filtered = records.filter((log) => {
    if (!search.trim()) return true
    return (log.medicine_name || '').toLowerCase().includes(search.toLowerCase())
  })

  const todayRecords = filtered.filter((r) => isSameLocalDay(r.scheduled_datetime))
  const earlierRecords = filtered.filter((r) => !isSameLocalDay(r.scheduled_datetime))

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
                {timeFilterLabels.map(tf => (
                  <option key={tf.value} value={tf.value} className={isLight ? 'bg-white' : 'bg-navy-800'}>{tf.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className={`skeleton h-28 ${isLight ? '!bg-navy-100' : ''}`} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
          <EmptyState />
        </motion.div>
      ) : (
        <div className="space-y-6">
          {todayRecords.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Today
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {todayRecords.map(r => (
                  <HistoryCard key={r.id} item={r} />
                ))}
              </div>
            </motion.div>
          )}

          {earlierRecords.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Earlier
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {earlierRecords.map(r => (
                  <HistoryCard key={r.id} item={r} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-6 flex items-center justify-center gap-2 text-xs px-4 py-3 rounded-2xl border ${
            isLight ? 'bg-white border-navy-100 text-navy-400 shadow-sm' : 'glass-card text-white/30'
          }`}
        >
          <Clock className="w-3 h-3" />
          {filter === 'today' ? 'Showing today\'s history' : filter === 'week' ? 'Showing last 7 days' : 'Showing all history'}
        </motion.div>
      )}
    </div>
  )
}
