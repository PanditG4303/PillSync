import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Weight, Ruler, HeartPulse, Droplets, Moon, Footprints, Thermometer,
  Gauge, Activity, Brain, Trash2, Plus, Wind, Coffee, Smile, AlertCircle,
  Bluetooth, Battery, Link2, Unlink, Watch,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { MarkdownContent } from '../components/Markdown'
import API from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const METRIC_FIELDS = [
  { type: 'weight', label: 'Weight', icon: Weight, unit: 'kg', color: 'emerald', step: 0.1, placeholder: '70.5', min: 1 },
  { type: 'height', label: 'Height', icon: Ruler, unit: 'cm', color: 'cyan', step: 0.1, placeholder: '170', min: 50 },
  { type: 'blood_pressure', label: 'Blood Pressure', icon: HeartPulse, unit: 'mmHg', color: 'red', text: true, placeholder: '120/80', min: 0 },
  { type: 'sugar_level', label: 'Sugar Level', icon: Droplets, unit: 'mg/dL', color: 'orange', step: 0.1, placeholder: '110', min: 10 },
  { type: 'heart_rate', label: 'Heart Rate', icon: Activity, unit: 'bpm', color: 'pink', step: 1, placeholder: '72', min: 20 },
  { type: 'blood_oxygen', label: 'Blood Oxygen', icon: Wind, unit: '%', color: 'cyan', step: 0.1, placeholder: '98', min: 50, max: 100 },
  { type: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C', color: 'orange', step: 0.1, placeholder: '36.8', min: 30, max: 45 },
  { type: 'sleep_hours', label: 'Sleep Hours', icon: Moon, unit: 'hrs', color: 'violet', step: 0.5, placeholder: '7.5', min: 0, max: 24 },
  { type: 'water_intake', label: 'Water Intake', icon: Coffee, unit: 'ml', color: 'blue', step: 50, placeholder: '2000', min: 0 },
  { type: 'daily_steps', label: 'Daily Steps', icon: Footprints, unit: 'steps', color: 'emerald', step: 100, placeholder: '8000', min: 0 },
  { type: 'mood', label: 'Mood', icon: Smile, unit: '/5', color: 'pink', step: 1, placeholder: '4', min: 1, max: 5 },
]

const COLOR_MAP = {
  emerald: { light: 'bg-emerald-100 text-emerald-600', dark: 'bg-emerald-500/20 text-emerald-400', bar: 'from-emerald-400 to-emerald-500' },
  cyan: { light: 'bg-cyan-100 text-cyan-600', dark: 'bg-cyan-500/20 text-cyan-400', bar: 'from-cyan-400 to-cyan-500' },
  violet: { light: 'bg-violet-100 text-violet-600', dark: 'bg-violet-500/20 text-violet-400', bar: 'from-violet-400 to-violet-500' },
  orange: { light: 'bg-orange-100 text-orange-600', dark: 'bg-orange-500/20 text-orange-400', bar: 'from-orange-400 to-orange-500' },
  pink: { light: 'bg-pink-100 text-pink-600', dark: 'bg-pink-500/20 text-pink-400', bar: 'from-pink-400 to-pink-500' },
  blue: { light: 'bg-blue-100 text-blue-600', dark: 'bg-blue-500/20 text-blue-400', bar: 'from-blue-400 to-blue-500' },
  red: { light: 'bg-red-100 text-red-600', dark: 'bg-red-500/20 text-red-400', bar: 'from-red-400 to-red-500' },
}

function Sparkline({ values, color = 'emerald' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  if (!values || values.length === 0) return null
  const max = Math.max(...values.map((v) => v.value), 1)
  const min = Math.min(...values.map((v) => v.value), 0)
  const range = max - min || 1
  const points = values.map((v, i) => ({
    x: (i / Math.max(values.length - 1, 1)) * 100,
    y: 100 - ((v.value - min) / range) * 90 - 5,
  }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16">
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={isLight ? (color === 'emerald' ? '#22C55E' : '#8B5CF6') : '#34D399'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MetricCard({ field, trend, onDelete }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const colors = COLOR_MAP[field.color] || COLOR_MAP.emerald
  const latest = trend?.length ? trend[trend.length - 1] : null
  const change = trend?.length >= 2 ? trend[trend.length - 1].value - trend[0].value : null
  return (
    <motion.div variants={itemAnim} className={`p-5 rounded-3xl border ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? colors.light : colors.dark}`}>
            <field.icon className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{field.label}</p>
            {latest && (
              <p className={`text-xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
                {latest.value_text || latest.value} <span className={`text-xs font-medium ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{field.unit}</span>
              </p>
            )}
          </div>
        </div>
        {latest && (
          <button
            type="button"
            onClick={() => onDelete(latest.id)}
            title={`Delete latest ${field.label} entry`}
            className={`p-2 rounded-xl transition-colors ${isLight ? 'text-navy-300 hover:text-red-500 hover:bg-red-50' : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Sparkline values={trend || []} color={field.color} />
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
          {trend?.length || 0} entries
        </span>
        {change !== null && (
          <span className={`text-[11px] font-medium ${change >= 0 ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-red-500' : 'text-red-400')}`}>
            {change >= 0 ? '+' : ''}{change} {field.unit}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function EntryForm({ onSave }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [active, setActive] = useState('weight')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const field = METRIC_FIELDS.find((f) => f.type === active)

  const submit = async (e) => {
    e.preventDefault()
    if (!value.trim()) return
    setSaving(true)
    setError('')
    try {
      let payload
      if (field.text) {
        const parts = value.replace(',', '/').split('/')
        const systolic = parseFloat(parts[0])
        const diastolic = parts[1] ? parseFloat(parts[1]) : 0
        if (isNaN(systolic) || isNaN(diastolic)) {
          setError('Enter blood pressure as systolic/diastolic, e.g. 120/80')
          setSaving(false)
          return
        }
        payload = { metric_type: active, value: systolic, value_text: value.trim(), unit: 'mmHg', notes }
      } else {
        const num = parseFloat(value)
        if (isNaN(num)) {
          setError('Enter a valid number')
          setSaving(false)
          return
        }
        payload = { metric_type: active, value: num, unit: field.unit, notes }
      }
      await onSave(payload)
      setValue('')
      setNotes('')
    } catch {
      setError('Could not save entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
          <Plus className="w-4 h-4" />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Log a Health Reading</h2>
          <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Manual entry — stored in your database</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {METRIC_FIELDS.map((f) => (
          <button
            key={f.type}
            type="button"
            onClick={() => { setActive(f.type); setValue(''); setError('') }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              active === f.type
                ? isLight ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'
                : isLight ? 'bg-navy-50 text-navy-500 hover:bg-navy-100' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1]'
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type={field.text ? 'text' : 'number'}
            step={field.step}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`glass-input ${field.text ? 'appearance-none' : ''}`}
          />
          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{field.unit}</span>
        </div>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="glass-input flex-1"
        />
        <button type="submit" disabled={saving || !value.trim()} className="btn-primary !py-3">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      {field.text && (
        <p className={`text-[11px] mt-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
          Blood pressure format: systolic/diastolic, e.g. 120/80
        </p>
      )}
      {error && (
        <p className={`text-xs mt-2 flex items-center gap-1.5 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </motion.div>
  )
}

function DeviceSyncCard({ onSave }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator
  const [device, setDevice] = useState(null)
  const [deviceName, setDeviceName] = useState('')
  const [heartRate, setHeartRate] = useState(null)
  const [battery, setBattery] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const hrCharRef = useRef(null)

  const onHrValue = (event) => {
    try {
      const dv = event.target.value
      const flags = dv.getUint8(0)
      const hr = flags & 0x01 ? dv.getUint16(1, true) : dv.getUint8(1)
      if (hr > 0 && hr < 300) setHeartRate(hr)
    } catch {
      /* malformed frame */
    }
  }

  const scan = async () => {
    setStatus('scanning')
    setErrorMsg('')
    try {
      const d = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }, { services: ['battery_service'] }],
        optionalServices: ['battery_service', 'device_information'],
      })
      setDevice(d)
      setDeviceName(d.name || 'Bluetooth device')
      const server = await d.gatt.connect()

      try {
        const batteryService = await server.getPrimaryService('battery_service')
        const batteryChar = await batteryService.getCharacteristic('battery_level')
        const value = await batteryChar.readValue()
        setBattery(value.getUint8(0))
      } catch {
        setBattery(null)
      }

      try {
        const hrService = await server.getPrimaryService('heart_rate')
        const hrChar = await hrService.getCharacteristic('heart_rate_measurement')
        await hrChar.startNotifications()
        hrChar.addEventListener('characteristicvaluechanged', onHrValue)
        hrCharRef.current = hrChar
      } catch {
        setErrorMsg('Connected, but no live heart-rate data was found on this device.')
      }

      setStatus('connected')
      d.addEventListener('gattserverdisconnected', () => {
        setStatus('idle')
        setHeartRate(null)
        setDevice(null)
        setBattery(null)
        hrCharRef.current = null
      })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message || 'Could not connect to the device')
    }
  }

  const stop = () => {
    if (device && device.gatt && device.gatt.connected) {
      try { device.gatt.disconnect() } catch { /* already gone */ }
    }
    setDevice(null)
    setHeartRate(null)
    setBattery(null)
    setStatus('idle')
    hrCharRef.current = null
  }

  const saveReading = async () => {
    if (!heartRate) return
    setSaving(true)
    try {
      await onSave({
        metric_type: 'heart_rate',
        value: heartRate,
        unit: 'bpm',
        notes: `Synced from ${deviceName} via Bluetooth`,
      })
    } catch {
      /* surfaced by parent */
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
          <Watch className="w-4 h-4" />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Sync From Fitness Tracker / Smartwatch</h2>
          <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
            Live heart rate and battery over Bluetooth (Chrome / Edge)
          </p>
        </div>
      </div>

      {!supported ? (
        <p className={`text-xs p-3.5 rounded-2xl border flex items-start gap-2 ${
          isLight ? 'bg-navy-50 text-navy-500 border-navy-100' : 'bg-white/[0.05] text-white/50 border-white/[0.08]'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          Bluetooth sync requires a Chromium browser (Chrome or Edge). You can still log every
          reading manually below — your data stays under your control.
        </p>
      ) : status === 'connected' ? (
        <div className="space-y-3">
          <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl border ${
            isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/25'
          }`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
                {deviceName}
              </p>
              <p className={`text-2xl font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {heartRate ?? '--'} <span className={`text-xs font-medium ${isLight ? 'text-navy-400' : 'text-white/40'}`}>bpm live</span>
              </p>
            </div>
            {battery !== null && (
              <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>
                <Battery className="w-4 h-4" /> {battery}%
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveReading}
              disabled={saving || !heartRate}
              className="flex-1 flex items-center justify-center gap-1.5 btn-primary !py-2.5 !text-xs"
            >
              <Link2 className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Reading'}
            </button>
            <button
              type="button"
              onClick={stop}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                isLight ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <Unlink className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {status === 'scanning' && (
            <p className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>
              Searching for your device… pick it in the browser popup, then allow pairing.
            </p>
          )}
          {status === 'error' && (
            <p className={`text-xs p-3 rounded-2xl border flex items-center gap-2 ${
              isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
            </p>
          )}
          <button
            type="button"
            onClick={scan}
            disabled={status === 'scanning'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all btn-primary"
          >
            <Bluetooth className="w-4 h-4" />
            {status === 'scanning' ? 'Scanning…' : 'Scan & Connect'}
          </button>
          <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
            Heart-rate is read live from the standard Bluetooth Heart Rate service (0x180D).
            Readings you save are stored in your health records like manual entries.
          </p>
        </div>
      )}
    </motion.div>
  )
}

function BmiCard({ bmi }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  if (!bmi) return null
  const max = 40
  const pct = Math.min(bmi.value, max) / max * 100
  return (
    <motion.div variants={itemAnim} className={`p-5 rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400'}`}>
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Body Mass Index</p>
            <p className={`text-xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
              {bmi.value} <span className={`text-xs font-medium ${isLight ? 'text-navy-400' : 'text-white/40'}`}>— {bmi.band}</span>
            </p>
          </div>
        </div>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-orange-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className={isLight ? 'text-navy-400' : 'text-white/30'}>Under 18.5</span>
        <span className={isLight ? 'text-navy-400' : 'text-white/30'}>18.5–25</span>
        <span className={isLight ? 'text-navy-400' : 'text-white/30'}>25–30</span>
        <span className={isLight ? 'text-navy-400' : 'text-white/30'}>30+</span>
      </div>
      <p className={`text-[11px] mt-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
        From latest weight ({bmi.weight_kg} kg) and height ({bmi.height_cm} cm)
      </p>
    </motion.div>
  )
}

export default function HealthMonitor() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [summary, setSummary] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const [summaryRes, insightsRes] = await Promise.all([
        API.get('/health/summary?days=30'),
        API.get('/health/insights?days=14'),
      ])
      setSummary(summaryRes.data)
      setInsights(insightsRes.data)
    } catch {
      setError('Could not load health data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const saveMetric = async (payload) => {
    await API.post('/health/metrics', payload)
    await fetchAll()
  }

  const deleteMetric = async (id) => {
    await API.delete(`/health/metrics/${id}`)
    await fetchAll()
  }

  const trendsByType = useMemo(() => {
    const map = {}
    for (const field of METRIC_FIELDS) {
      map[field.type] = summary?.trends?.[field.type] || []
    }
    return map
  }, [summary])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
      <motion.div variants={itemAnim} className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
          Health <span className="text-gradient">Monitor</span>
        </h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
          Track your vitals daily — weight, blood pressure, sugar, sleep, water, steps and more.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={itemAnim} className={`mb-6 p-4 rounded-3xl border text-sm ${
          isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>{error}</motion.div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`skeleton h-48 ${isLight ? '!bg-navy-100' : ''}`} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <EntryForm onSave={saveMetric} />
            </div>
            <BmiCard bmi={summary?.bmi} />
          </div>

          <div className="mb-6">
            <DeviceSyncCard onSave={saveMetric} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {METRIC_FIELDS.filter((f) => f.type !== 'bmi').map((field) => (
              <MetricCard key={field.type} field={field} trend={trendsByType[field.type]} onDelete={deleteMetric} />
            ))}
          </div>

          <motion.div variants={itemAnim} className={`rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'} p-5 md:p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400'}`}>
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>AI Health Insights</h2>
                <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                  {insights?.engine === 'ai' ? 'Generated by Nemotron' : 'Generated from your latest readings'}
                </p>
              </div>
            </div>
            <MarkdownContent text={insights?.insights || ''} />
            <p className={`text-[10px] mt-4 pt-3 border-t ${isLight ? 'text-navy-300 border-navy-100' : 'text-white/25 border-white/[0.06]'}`}>
              Insights are informational only and are not a substitute for professional medical advice.
            </p>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}