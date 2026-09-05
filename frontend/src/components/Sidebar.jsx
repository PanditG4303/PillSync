import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Pill, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, ScanLine, Clock, Bot, BarChart3, Settings as SettingsIcon, Package, Shield, UserCircle2, MonitorSmartphone, HeartPulse, Salad, BellRing } from 'lucide-react'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'

const baseNavItems = [
  { to: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard, color: 'emerald' },
  { to: '/medicines',    label: 'Medicines',      icon: Pill,            color: 'emerald' },
  { to: '/reminders',    label: 'Reminders',      icon: BellRing,        color: 'orange' },
  { to: '/health',       label: 'Health Monitor', icon: HeartPulse,      color: 'pink' },
  { to: '/nutrition',    label: 'Nutrition',      icon: Salad,           color: 'lime' },
  { to: '/reports',      label: 'Reports',        icon: BarChart3,       color: 'blue' },
  { to: '/ai-assistant', label: 'AI Assistant',   icon: Bot,             color: 'cyan' },
  { to: '/ai-scanner',   label: 'Scanner',        icon: ScanLine,        color: 'violet' },
  { to: '/settings',     label: 'Settings',       icon: SettingsIcon,    color: 'slate' },
]

const adminNavItem = { to: '/admin', label: 'Admin Portal', icon: Shield, color: 'orange' }

function getNavItems(role) {
  const items = [...baseNavItems]
  if (role === 'Admin') {
    items.splice(items.length - 1, 0, adminNavItem)
  }
  return items
}

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
}

const sectionGradients = {
  emerald: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
  violet: 'from-violet-500/15 to-violet-500/5 border-violet-500/20',
  cyan: 'from-cyan-500/15 to-cyan-500/5 border-cyan-500/20',
  orange: 'from-orange-500/15 to-orange-500/5 border-orange-500/20',
  blue: 'from-blue-500/15 to-blue-500/5 border-blue-500/20',
  slate: 'from-slate-500/15 to-slate-500/5 border-slate-500/20',
  pink: 'from-pink-500/15 to-pink-500/5 border-pink-500/20',
  lime: 'from-lime-500/15 to-lime-500/5 border-lime-500/20',
}

const dotColors = {
  emerald: 'bg-emerald-400 shadow-glow-emerald',
  violet: 'bg-violet-400 shadow-glow-violet',
  cyan: 'bg-cyan-400 shadow-glow-cyan',
  orange: 'bg-orange-400 shadow-glow-orange',
  blue: 'bg-blue-400 shadow-glow-cyan',
  slate: 'bg-slate-400 shadow-glow-pink',
  pink: 'bg-pink-400 shadow-glow-pink',
  lime: 'bg-lime-400 shadow-glow-emerald',
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const initials = (user?.name || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const goToSettings = useCallback(() => {
    navigate('/settings')
    onClose?.()
  }, [navigate, onClose])

  const asideClasses = `fixed left-0 top-0 h-full ${
    collapsed ? 'w-20' : 'w-64'
  } z-50 flex flex-col ${
    theme === 'light'
      ? 'bg-white/95 backdrop-blur-2xl border-r border-navy-100'
      : 'border-r border-white/[0.06] bg-navy-900/95 backdrop-blur-2xl'
  } transition-transform duration-300 md:translate-x-0 ${
    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  }`

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}
    <motion.aside
      layout
      className={asideClasses}
    >
      <div className={`h-16 flex items-center gap-3 px-4 border-b ${
        theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'
      }`}>
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0 shadow-glow-emerald">
          <Pill className="w-5 h-5 text-navy-900" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-lg font-bold text-gradient whitespace-nowrap overflow-hidden"
            >
              PillSync <span className="text-[10px] font-semibold text-white/30 ml-1">v2</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {getNavItems(user?.role).map(({ to, label, icon: Icon, color }, i) => {
          const isActive = location.pathname === to
          return (
            <motion.div
              key={to}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <NavLink
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? theme === 'light' ? 'text-navy-800' : 'text-white'
                    : theme === 'light'
                      ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-50'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className={`absolute inset-0 rounded-2xl ${
                      theme === 'light'
                        ? 'bg-navy-100 border border-navy-200'
                        : `bg-gradient-to-r ${sectionGradients[color]}`
                    }`}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="w-5 h-5 flex items-center justify-center shrink-0 relative z-10">
                  <Icon className="w-5 h-5" />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate relative z-10"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <div className={`ml-auto relative z-10 w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
                )}
              </NavLink>
            </motion.div>
          )
        })}
      </nav>

      <div className={`px-3 py-3 border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'}`}>
        {!collapsed && user && (
          <div className="px-3 py-3 mb-2 rounded-2xl border transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0 overflow-hidden">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-navy-900">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-semibold truncate ${theme === 'light' ? 'text-navy-800' : 'text-white/90'}`}>
                    {user.name || 'Signed in'}
                  </p>
                  <UserCircle2 className={`w-3.5 h-3.5 shrink-0 ${theme === 'light' ? 'text-emerald-500' : 'text-emerald-400'}`} />
                </div>
                <p className={`text-[11px] truncate ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                  {user.email}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    theme === 'light'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {user.role || 'Patient'}
                  </span>
                  {user.auth_provider === 'google' && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      theme === 'light'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      Google
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={goToSettings}
              className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                theme === 'light' ? 'text-navy-400 hover:text-emerald-600' : 'text-white/40 hover:text-emerald-400'
              }`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              Who is logged in? Manage sessions
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
            theme === 'light' ? 'text-navy-400 hover:text-red-600 hover:bg-red-50' : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute -right-3 top-20 w-6 h-6 rounded-full hidden md:flex items-center justify-center transition-colors ${
          theme === 'light'
            ? 'bg-white border border-navy-200 shadow-sm text-navy-400 hover:text-navy-700'
            : 'bg-navy-800 border border-white/[0.08] shadow-glass text-white/40 hover:text-white/70'
        }`}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
    </>
  )
}
