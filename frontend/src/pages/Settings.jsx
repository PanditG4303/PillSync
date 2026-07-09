import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { settingsItems } from '../data'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function SettingCard({ icon: Icon, label, desc, index }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const iconColors = isLight ? [
    'from-emerald-100 to-emerald-50 text-emerald-600',
    'from-cyan-100 to-cyan-50 text-cyan-600',
    'from-violet-100 to-violet-50 text-violet-600',
    'from-orange-100 to-orange-50 text-orange-600',
    'from-pink-100 to-pink-50 text-pink-600',
    'from-emerald-100 to-emerald-50 text-emerald-600',
    'from-cyan-100 to-cyan-50 text-cyan-600',
    'from-violet-100 to-violet-50 text-violet-600',
  ] : [
    'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
    'from-violet-500/20 to-violet-500/5 text-violet-400',
    'from-orange-500/20 to-orange-500/5 text-orange-400',
    'from-pink-500/20 to-pink-500/5 text-pink-400',
    'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
    'from-violet-500/20 to-violet-500/5 text-violet-400',
  ]
  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 flex items-center gap-4 cursor-pointer group rounded-3xl border transition-all ${
        isLight
          ? 'bg-white border-navy-100 shadow-sm hover:shadow-md'
          : 'glass-card-hover'
      }`}
    >
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${iconColors[index % iconColors.length]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold transition-colors ${isLight ? 'text-navy-700 group-hover:text-navy-900' : 'text-white/90 group-hover:text-white'}`}>{label}</h3>
        <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{desc}</p>
      </div>
      <ChevronRight className={`w-4 h-4 transition-colors ${isLight ? 'text-navy-300 group-hover:text-navy-500' : 'text-white/20 group-hover:text-white/40'}`} />
    </motion.div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Settings</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Manage your account and preferences.</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="mb-6">
        <div className={`p-5 md:p-6 flex items-center gap-4 mb-6 rounded-3xl border ${
          isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-navy-900 text-2xl font-bold shadow-glow-emerald">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div>
            <p className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>{user?.name || 'User'}</p>
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{user?.email || 'user@pillsync.ai'}</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 border ${isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              {user?.role || 'Patient'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {settingsItems.map((item, i) => (
            <SettingCard key={item.label} {...item} index={i} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
