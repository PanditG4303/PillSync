import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill, Plus, Clock, CalendarDays, FileText, ArrowLeft, Save, Trash2,
  Edit3, Power, PowerOff, X, AlertCircle, CheckCircle, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../components/ThemeContext'
import { HealthIllustration } from '../components/illustrations'
import API from '../api'

const medicineTypes = [
  'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Other',
]

const dayOptions = [
  { value: '0', label: 'Mon' },
  { value: '1', label: 'Tue' },
  { value: '2', label: 'Wed' },
  { value: '3', label: 'Thu' },
  { value: '4', label: 'Fri' },
  { value: '5', label: 'Sat' },
  { value: '6', label: 'Sun' },
]

function DaySelector({ selected, onChange }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const days = selected ? selected.split(',').map(d => d.trim()) : []

  const toggle = (val) => {
    let newDays
    if (days.includes(val)) {
      newDays = days.filter(d => d !== val)
    } else {
      newDays = [...days, val]
    }
    onChange(newDays.length ? newDays.join(',') : null)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {dayOptions.map(d => {
        const active = days.includes(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              active
                ? isLight
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isLight
                  ? 'bg-navy-50 text-navy-400 border border-navy-100 hover:bg-navy-100'
                  : 'bg-white/[0.04] text-white/40 border border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

function MedicineForm({ initial, onSave, onCancel, loading }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [form, setForm] = useState({
    name: initial?.name || '',
    dosage: initial?.dosage || '',
    dosage_unit: initial?.dosage_unit || '',
    medicine_type: initial?.medicine_type || 'Tablet',
    instructions: initial?.instructions || '',
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    is_active: initial?.is_active !== undefined ? initial.is_active : true,
    schedules: initial?.schedules?.length
      ? initial.schedules.map(s => ({ reminder_time: s.reminder_time, days_of_week: s.days_of_week || null }))
      : [{ reminder_time: '08:00', days_of_week: null }],
  })

  const addTime = () => {
    setForm(prev => ({
      ...prev,
      schedules: [...prev.schedules, { reminder_time: '12:00', days_of_week: null }],
    }))
  }

  const removeTime = (idx) => {
    if (form.schedules.length <= 1) return
    setForm(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== idx),
    }))
  }

  const updateSchedule = (idx, field, value) => {
    setForm(prev => {
      const schedules = [...prev.schedules]
      schedules[idx] = { ...schedules[idx], [field]: value }
      return { ...prev, schedules }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Medicine Name</label>
          <div className="relative">
            <Pill className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
            <input
              type="text"
              placeholder="e.g. Paracetamol"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11`}
              required
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Dosage</label>
          <input
            type="text"
            placeholder="e.g. 500"
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Unit</label>
          <select
            value={form.dosage_unit}
            onChange={(e) => setForm({ ...form, dosage_unit: e.target.value })}
            className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-select`}
          >
            <option value="" className={isLight ? 'bg-white' : 'bg-navy-800'}>Select</option>
            <option value="mg" className={isLight ? 'bg-white' : 'bg-navy-800'}>mg</option>
            <option value="g" className={isLight ? 'bg-white' : 'bg-navy-800'}>g</option>
            <option value="mcg" className={isLight ? 'bg-white' : 'bg-navy-800'}>mcg</option>
            <option value="ml" className={isLight ? 'bg-white' : 'bg-navy-800'}>ml</option>
            <option value="IU" className={isLight ? 'bg-white' : 'bg-navy-800'}>IU</option>
            <option value="tablet" className={isLight ? 'bg-white' : 'bg-navy-800'}>tablet</option>
            <option value="capsule" className={isLight ? 'bg-white' : 'bg-navy-800'}>capsule</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Type</label>
          <select
            value={form.medicine_type}
            onChange={(e) => setForm({ ...form, medicine_type: e.target.value })}
            className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-select`}
          >
            {medicineTypes.map(t => (
              <option key={t} value={t} className={isLight ? 'bg-white' : 'bg-navy-800'}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Start Date</label>
          <div className="relative">
            <CalendarDays className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input pl-11`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>End Date (optional)</label>
          <div className="relative">
            <CalendarDays className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input pl-11`}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
          Reminder Times <span className="text-xs opacity-60">(add multiple)</span>
        </label>
        <div className="space-y-2">
          {form.schedules.map((sched, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                  <input
                    type="time"
                    value={sched.reminder_time}
                    onChange={(e) => updateSchedule(idx, 'reminder_time', e.target.value)}
                    className={`flex-1 ${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input py-2`}
                    required
                  />
                </div>
                <div>
                  <p className={`text-xs mb-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Days of week (leave empty for daily)</p>
                  <DaySelector
                    selected={sched.days_of_week}
                    onChange={(val) => updateSchedule(idx, 'days_of_week', val)}
                  />
                </div>
              </div>
              {form.schedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTime(idx)}
                  className={`p-2 rounded-xl transition-colors ${isLight ? 'text-red-400 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addTime}
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-500' : 'text-emerald-400 hover:text-emerald-300'}`}
        >
          <Plus className="w-3.5 h-3.5" /> Add another time
        </button>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Instructions (optional)</label>
        <div className="relative">
          <FileText className={`absolute left-4 top-3.5 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
          <textarea
            rows={2}
            placeholder="e.g. Take with food, avoid alcohol..."
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 resize-none`}
          />
        </div>
      </div>

      {initial?.id && (
        <div className="flex items-center gap-2">
          <label className={`text-sm ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Active</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`p-2 rounded-xl transition-colors ${
              form.is_active
                ? isLight ? 'text-emerald-600 bg-emerald-100' : 'text-emerald-400 bg-emerald-500/20'
                : isLight ? 'text-navy-300 bg-navy-50' : 'text-white/30 bg-white/[0.04]'
            }`}
          >
            {form.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <motion.button
          type="submit"
          disabled={loading || !form.name.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="btn-primary"
        >
          <Save className="w-4 h-4" /> {initial?.id ? 'Update Medicine' : 'Save Medicine'}
        </motion.button>
        <button
          type="button"
          onClick={onCancel}
          className={`btn-secondary ${isLight ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function MedicineCard({ medicine, onEdit, onToggle, onDelete }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-3xl transition-all duration-300 ${
        isLight
          ? 'bg-white border border-navy-100 shadow-sm hover:shadow-md'
          : 'glass-card-hover'
      } ${!medicine.is_active ? (isLight ? 'opacity-60' : 'opacity-50') : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
              {medicine.name}
              {medicine.dosage && <span className={`ml-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                {medicine.dosage}{medicine.dosage_unit ? ` ${medicine.dosage_unit}` : ''}
              </span>}
            </p>
            <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
              {medicine.medicine_type || 'Medicine'}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
          medicine.is_active
            ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
            : isLight ? 'bg-navy-100 text-navy-400' : 'bg-white/[0.06] text-white/40'
        }`}>
          {medicine.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {medicine.schedules?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {medicine.schedules.map(s => (
            <span key={s.id} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
              isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              <Clock className="w-3 h-3" /> {s.reminder_time}
            </span>
          ))}
        </div>
      )}

      {medicine.instructions && (
        <p className={`text-xs mb-3 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{medicine.instructions}</p>
      )}

      <div className={`flex items-center gap-1 pt-2 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'}`}>
        <button
          onClick={() => onEdit(medicine)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-colors ${
            isLight ? 'text-navy-400 hover:text-cyan-600 hover:bg-cyan-50' : 'text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10'
          }`}
        >
          <Edit3 className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={() => onToggle(medicine)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-colors ${
            isLight
              ? medicine.is_active ? 'text-navy-400 hover:text-orange-600 hover:bg-orange-50' : 'text-emerald-600 bg-emerald-100'
              : medicine.is_active ? 'text-white/40 hover:text-orange-400 hover:bg-orange-500/10' : 'text-emerald-400 bg-emerald-500/20'
          }`}
        >
          {medicine.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
          {medicine.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(medicine)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-colors ${
            isLight ? 'text-navy-400 hover:text-red-600 hover:bg-red-50' : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
          }`}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
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
      <h3 className={`text-lg font-semibold mb-1 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>No medicines yet</h3>
      <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Add your first medication to start tracking.</p>
    </div>
  )
}

export default function AddMedicine() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetchMedicines = async () => {
    try {
      setLoading(true)
      const res = await API.get('/medicines')
      setMedicines(res.data)
    } catch {
      setError('Failed to load medicines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedicines()
  }, [])

  const handleSave = async (data) => {
    try {
      setSaving(true)
      setError('')
      if (editing?.id) {
        await API.put(`/medicines/${editing.id}`, data)
      } else {
        await API.post('/medicines', data)
      }
      setShowForm(false)
      setEditing(null)
      await fetchMedicines()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save medicine')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (medicine) => {
    setEditing(medicine)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggle = async (medicine) => {
    try {
      await API.patch(`/medicines/${medicine.id}/toggle`)
      await fetchMedicines()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Failed to toggle medicine')
    }
  }

  const handleDelete = async (medicine) => {
    if (!window.confirm(`Delete ${medicine.name}? This cannot be undone.`)) return
    setEditing(null)
    try {
      await API.delete(`/medicines/${medicine.id}`)
      await fetchMedicines()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Failed to delete medicine')
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-1.5 text-sm transition-colors mb-3 ${isLight ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/70'}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Medicines</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Manage your medications and schedules.</p>
          </div>
          {!showForm && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => { setShowForm(true); setEditing(null) }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Medicine
            </motion.button>
          )}
        </div>
      </motion.div>

      {error && (
        <div className={`mb-4 p-3 rounded-2xl text-sm flex items-center gap-2 ${
          isLight ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <AlertCircle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-6 md:p-8 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}
          >
            <h2 className={`text-lg font-semibold mb-5 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
              {editing ? 'Edit Medicine' : 'Add New Medicine'}
            </h2>
            <MedicineForm
              initial={editing}
              onSave={handleSave}
              onCancel={cancelForm}
              loading={saving}
            />
          </motion.div>
        ) : (
          <motion.div key="list">
            {medicines.length > 0 && (
              <div className="mb-4">
                <div className="relative max-w-xs">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`pl-9 pr-4 py-2 rounded-2xl text-sm w-full ${
                      isLight
                        ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-navy-300'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 placeholder:text-white/30'
                    }`}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`skeleton h-40 ${isLight ? '!bg-navy-100' : ''}`} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className={`rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
                <EmptyState />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map(med => (
                  <MedicineCard
                    key={med.id}
                    medicine={med}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className={`text-xs text-center mt-4 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                {filtered.length} medicine{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
