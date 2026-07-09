import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pill, Camera, Clock, CalendarDays, FileText, ArrowLeft, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { frequencyOptions } from '../data'
import { useTheme } from '../components/ThemeContext'

export default function AddMedicine() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    startDate: '',
    notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-1.5 text-sm transition-colors mb-3 ${isLight ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/70'}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Add Medicine</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Enter medication details or scan a prescription.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className={`p-6 md:p-8 space-y-6 rounded-3xl border ${
          isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
        }`}>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Medicine Name</label>
              <div className="relative">
                <Pill className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                <input
                  type="text"
                  placeholder="e.g. Aspirin"
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
                placeholder="e.g. 100mg"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Frequency</label>
              <div className="relative">
                <Camera className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-select pl-11`}
                  required
                >
                  <option value="" className={isLight ? 'bg-white' : 'bg-navy-800'}>Select frequency</option>
                  {frequencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className={isLight ? 'bg-white' : 'bg-navy-800'}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Time</label>
              <div className="relative">
                <Clock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input pl-11`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Start Date</label>
              <div className="relative">
                <CalendarDays className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input pl-11`}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>Notes (optional)</label>
            <div className="relative">
              <FileText className={`absolute left-4 top-3.5 w-4 h-4 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
              <textarea
                rows={3}
                placeholder="Any additional instructions..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 resize-none`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`btn-primary ${isLight ? 'shadow-md shadow-emerald-200' : ''}`}
            >
              <Save className="w-4 h-4" /> Save Medicine
            </motion.button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`btn-secondary ${isLight ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
