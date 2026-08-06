import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Shield, UserCheck, Activity, Pill, ClipboardList,
  ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
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

function StatCard({ label, value, sub, icon: Icon, color }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colorMap = {
    emerald: isLight ? 'text-emerald-600 bg-emerald-100' : 'text-emerald-400 bg-emerald-500/20',
    cyan:    isLight ? 'text-cyan-600 bg-cyan-100'       : 'text-cyan-400 bg-cyan-500/20',
    violet:  isLight ? 'text-violet-600 bg-violet-100'   : 'text-violet-400 bg-violet-500/20',
    orange:  isLight ? 'text-orange-600 bg-orange-100'   : 'text-orange-400 bg-orange-500/20',
    pink:    isLight ? 'text-pink-600 bg-pink-100'       : 'text-pink-400 bg-pink-500/20',
    blue:    isLight ? 'text-blue-600 bg-blue-100'       : 'text-blue-400 bg-blue-500/20',
  }
  return (
    <motion.div
      variants={itemAnim}
      className={`p-5 transition-all duration-300 ${
        isLight
          ? 'bg-white rounded-3xl shadow-sm border border-navy-100 hover:shadow-md'
          : 'glass-card-hover'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorMap[color] || colorMap.emerald}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{sub}</p>
    </motion.div>
  )
}

function UserRow({ user: u, onRoleChange }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const roleBadge = {
    Patient:   isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400',
    Caregiver: isLight ? 'bg-violet-100 text-violet-700'   : 'bg-violet-500/20 text-violet-400',
    Admin:     isLight ? 'bg-orange-100 text-orange-700'   : 'bg-orange-500/20 text-orange-400',
  }
  const [editing, setEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState(u.role)

  const handleSave = async () => {
    if (selectedRole !== u.role) {
      await onRoleChange(u.id, selectedRole)
    }
    setEditing(false)
  }

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-2xl transition-all ${
      isLight ? 'hover:bg-navy-50' : 'hover:bg-white/[0.03]'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
          isLight ? 'bg-navy-100 text-navy-600' : 'bg-white/[0.06] text-white/60'
        }`}>
          {u.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{u.name}</p>
          <p className={`text-xs truncate ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{u.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={`text-xs rounded-xl px-2 py-1.5 border ${
                isLight
                  ? 'bg-white border-navy-200 text-navy-700'
                  : 'bg-navy-800 border-white/10 text-white/80'
              }`}
            >
              <option value="Patient">Patient</option>
              <option value="Caregiver">Caregiver</option>
              <option value="Admin">Admin</option>
            </select>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setSelectedRole(u.role) }}
              className={`text-xs px-2 py-1.5 rounded-xl ${isLight ? 'text-navy-500 hover:bg-navy-100' : 'text-white/50 hover:bg-white/[0.06]'}`}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[u.role] || roleBadge.Patient}`}>
              {u.role}
            </span>
            <button
              onClick={() => setEditing(true)}
              className={`text-xs px-2 py-1 rounded-xl transition-colors ${
                isLight ? 'text-navy-400 hover:text-navy-600 hover:bg-navy-100' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
              }`}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showAssignments, setShowAssignments] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, us, as_] = await Promise.all([
          API.get('/admin/overview'),
          API.get('/admin/users'),
          API.get('/admin/assignments'),
        ])
        setOverview(ov.data)
        setUsers(us.data.users || [])
        setAssignments(as_.data.assignments || [])
      } catch (err) {
        console.error('Admin load error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await API.patch(`/admin/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.data.user.role } : u))
      // refresh overview
      const ov = await API.get('/admin/overview')
      setOverview(ov.data)
    } catch (err) {
      console.error('Role update error', err)
    }
  }

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Loading admin panel…</div>
      </div>
    )
  }

  const stats = overview?.users || {}
  const platform = overview?.platform || {}

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
            Admin Portal
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            System overview and user management
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-medium ${
          isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-400'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          Admin
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.total ?? 0} sub="Registered accounts" icon={Users} color="emerald" />
        <StatCard label="Patients" value={stats.patients ?? 0} sub="Active patients" icon={UserCheck} color="cyan" />
        <StatCard label="Caregivers" value={stats.caregivers ?? 0} sub="Active caregivers" icon={Shield} color="violet" />
        <StatCard label="Admins" value={stats.admins ?? 0} sub="System admins" icon={Shield} color="orange" />
        <StatCard label="Medicines" value={platform.active_medicines ?? 0} sub="Active tracked" icon={Pill} color="pink" />
        <StatCard label="Logs" value={platform.medication_logs ?? 0} sub="History records" icon={ClipboardList} color="blue" />
      </div>

      {/* Users Section */}
      <motion.div
        variants={itemAnim}
        className={`rounded-3xl p-6 ${
          isLight ? 'bg-white shadow-sm border border-navy-100' : 'glass-card'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
            User Management
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
              <input
                type="text"
                placeholder="Search users…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`pl-9 pr-3 py-2 text-xs rounded-2xl w-48 ${
                  isLight
                    ? 'bg-navy-50 border border-navy-200 text-navy-700 placeholder:text-navy-300'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 placeholder:text-white/30'
                }`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className={`text-xs px-3 py-2 rounded-2xl border ${
                isLight
                  ? 'bg-navy-50 border-navy-200 text-navy-700'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/70'
              }`}
            >
              <option value="">All Roles</option>
              <option value="Patient">Patient</option>
              <option value="Caregiver">Caregiver</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <p className={`text-sm py-6 text-center ${isLight ? 'text-navy-400' : 'text-white/40'}`}>No users found</p>
          ) : (
            filteredUsers.map(u => (
              <UserRow key={u.id} user={u} onRoleChange={handleRoleChange} />
            ))
          )}
        </div>
      </motion.div>

      {/* Caregiver Assignments */}
      <motion.div
        variants={itemAnim}
        className={`rounded-3xl p-6 ${
          isLight ? 'bg-white shadow-sm border border-navy-100' : 'glass-card'
        }`}
      >
        <button
          onClick={() => setShowAssignments(!showAssignments)}
          className="flex items-center justify-between w-full"
        >
          <h2 className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
            Caregiver Assignments ({assignments.length})
          </h2>
          {showAssignments ? (
            <ChevronUp className={`w-5 h-5 ${isLight ? 'text-navy-400' : 'text-white/40'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${isLight ? 'text-navy-400' : 'text-white/40'}`} />
          )}
        </button>

        {showAssignments && (
          <div className="mt-4 space-y-2">
            {assignments.length === 0 ? (
              <p className={`text-sm py-4 text-center ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                No caregiver assignments yet
              </p>
            ) : (
              assignments.map(a => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between py-3 px-4 rounded-2xl ${
                    isLight ? 'bg-navy-50' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div>
                      <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Caregiver</p>
                      <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>
                        {a.caregiver?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className={`text-xs ${isLight ? 'text-navy-300' : 'text-white/20'}`}>→</div>
                    <div>
                      <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Patient</p>
                      <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/80'}`}>
                        {a.patient?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs ${isLight ? 'text-navy-300' : 'text-white/20'}`}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
