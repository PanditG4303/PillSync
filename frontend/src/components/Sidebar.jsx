import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Pill, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, ScanLine, Clock, Bot, BarChart3, Settings as SettingsIcon, Package, Shield } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'

const baseNavItems = [
  { to: '/dashboard',    label: 'Dashboard',           icon: LayoutDashboard, color: 'emerald' },
  { to: '/add-medicine', label: 'Medicines',           icon: Pill,            color: 'emerald' },
  { to: '/ai-scanner',   label: 'Scanner',             icon: ScanLine,        color: 'violet' },
  { to: '/refills',      label: 'Refills',             icon: Package,         color: 'orange' },
  { to: '/history',      label: 'History',             icon: Clock,           color: 'orange' },
  { to: '/ai-assistant', label: 'Med Guide',            icon: Bot,            color: 'cyan' },
  { to: '/reports',      label: 'Reports',             icon: BarChart3,       color: 'blue' },
  { to: '/settings',     label: 'Settings',            icon: SettingsIcon,    color: 'slate' },
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
}

const dotColors = {
  emerald: 'bg-emerald-400 shadow-glow-emerald',
  violet: 'bg-violet-400 shadow-glow-violet',
  cyan: 'bg-cyan-400 shadow-glow-cyan',
  orange: 'bg-orange-400 shadow-glow-orange',
  blue: 'bg-blue-400 shadow-glow-cyan',
  slate: 'bg-slate-400 shadow-glow-pink',
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

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
              PillSync
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-hidden">
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
          <div className="px-3 py-2 mb-2">
            <p className={`text-sm font-medium truncate ${theme === 'light' ? 'text-navy-700' : 'text-white/90'}`}>{user.name}</p>
            <p className={`text-xs truncate ${theme === 'light' ? 'text-navy-400' : 'text-white/30'}`}>{user.role || 'Patient'}</p>
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
