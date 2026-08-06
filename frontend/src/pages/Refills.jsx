import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Package, AlertTriangle, CheckCircle, Clock, RefreshCw, Pill, Save, X,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import API from '../api'

const statusStyles = {
  empty: { label: 'Empty', light: 'bg-red-100 text-red-700', dark: 'bg-red-500/20 text-red-400' },
  low: { label: 'Low stock', light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-500/20 text-orange-400' },
  watch: { label: 'Watch', light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-400' },
  ok: { label: 'OK', light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/20 text-emerald-400' },
  no_schedule: { label: 'No schedule', light: 'bg-navy-100 text-navy-500', dark: 'bg-white/[0.08] text-white/40' },
}

export default function Refills() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [data, setData] = useState(null)
  const [groups, setGroups] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [stockValue, setStockValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [predRes, catRes] = await Promise.all([
        API.get('/refills/predictions'),
        API.get('/refills/by-category'),
      ])
      setData(predRes.data)
      setGroups(catRes.data.groups || {})
      setError('')
    } catch {
      setError('Could not load refill predictions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const startEdit = (prediction) => {
    setEditingId(prediction.medicine_id)
    setStockValue(String(prediction.stock_remaining ?? 0))
  }

  const saveStock = async (medicineId) => {
    setSaving(true)
    try {
      await API.patch(`/refills/${medicineId}/stock`, {
        stock_remaining: Number(stockValue),
        quantity_total: Number(stockValue),
      })
      setEditingId(null)
      await fetchData()
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
    } catch {
      setError('Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>Refill Predictions</h1>
            <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
              AI estimates stock depletion from your dosage schedules and consumption.
            </p>
          </div>
          <button
            onClick={fetchData}
            className={`p-2.5 rounded-2xl ${isLight ? 'hover:bg-navy-100 text-navy-500' : 'hover:bg-white/[0.06] text-white/50'}`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {error && (
        <div className={`mb-4 p-3 rounded-2xl text-sm ${isLight ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'}`}>{error}</div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className={`skeleton h-24 ${isLight ? '!bg-navy-100' : ''}`} />)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Tracked medicines', value: data?.total_tracked ?? 0, icon: Package },
              { label: 'Low / empty stock', value: data?.low_stock_count ?? 0, icon: AlertTriangle },
              { label: 'Active alerts', value: data?.alerts?.length ?? 0, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={`p-5 rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                </div>
                <p className={`text-2xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>{value}</p>
                <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{label}</p>
              </div>
            ))}
          </div>

          {data?.alerts?.length > 0 && (
            <div className={`mb-6 p-4 rounded-3xl border ${isLight ? 'bg-orange-50 border-orange-200' : 'bg-orange-500/10 border-orange-500/20'}`}>
              <h2 className={`text-sm font-semibold mb-2 ${isLight ? 'text-orange-800' : 'text-orange-300'}`}>Refill alerts</h2>
              <div className="space-y-2">
                {data.alerts.map((a) => (
                  <p key={a.medicine_id} className={`text-sm ${isLight ? 'text-orange-700' : 'text-orange-200'}`}>
                    {a.alert_message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-8">
            {(data?.predictions || []).map((p) => {
              const style = statusStyles[p.status] || statusStyles.ok
              return (
                <div key={p.medicine_id} className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{p.name}</p>
                        <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                          {p.disease_category} · {p.average_daily_consumption}/day · {p.doses_per_day} dose(s)/day
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? style.light : style.dark}`}>
                      {style.label}
                    </span>
                  </div>

                  <div className={`mt-3 grid sm:grid-cols-4 gap-3 text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>
                    <div>
                      <p className="opacity-70">Stock left</p>
                      {editingId === p.medicine_id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min="0"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            className={`w-20 px-2 py-1 rounded-lg ${isLight ? 'bg-navy-50 border border-navy-200' : 'bg-white/[0.06] border border-white/[0.08]'}`}
                          />
                          <button onClick={() => saveStock(p.medicine_id)} disabled={saving} className="p-1 text-emerald-500"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(p)} className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700 hover:text-emerald-600' : 'text-white hover:text-emerald-400'}`}>
                          {p.stock_remaining} units
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="opacity-70">Days remaining</p>
                      <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>
                        {p.days_remaining == null ? '—' : p.days_remaining}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-70">Depletion date</p>
                      <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>
                        {p.estimated_depletion_date || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-70">Refill by</p>
                      <p className={`font-semibold mt-0.5 ${isLight ? 'text-navy-700' : 'text-white'}`}>
                        {p.recommended_refill_date || '—'}
                      </p>
                    </div>
                  </div>

                  {p.alert_message && (
                    <p className={`mt-3 text-xs flex items-center gap-1.5 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                      <AlertTriangle className="w-3.5 h-3.5" /> {p.alert_message}
                    </p>
                  )}
                </div>
              )
            })}

            {!data?.predictions?.length && (
              <div className={`p-10 text-center rounded-3xl border ${isLight ? 'bg-white border-navy-100' : 'glass-card'}`}>
                <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
                <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                  Add medicines with stock quantity to see refill predictions.
                </p>
              </div>
            )}
          </div>

          {Object.keys(groups).length > 0 && (
            <div>
              <h2 className={`text-lg font-semibold mb-3 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>By condition</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.entries(groups).map(([cat, meds]) => (
                  <div key={cat} className={`p-4 rounded-3xl border ${isLight ? 'bg-white border-navy-100' : 'glass-card'}`}>
                    <p className={`text-sm font-semibold mb-2 ${isLight ? 'text-navy-700' : 'text-white/80'}`}>{cat}</p>
                    <div className="space-y-1">
                      {meds.map((m) => (
                        <p key={m.id} className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>
                          {m.name} — stock {m.stock_remaining}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
