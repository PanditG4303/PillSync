import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine, Upload, FileImage, CheckCircle, Pill, Shield, Microscope, Brain,
  AlertCircle, X, Save, Clock, Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../components/ThemeContext'
import { PrescriptionIllustration } from '../components/illustrations'
import API from '../api'

const scanningSteps = [
  { icon: ScanLine, label: 'Scanning prescription...', duration: 600 },
  { icon: Microscope, label: 'AI reading prescription...', duration: 800 },
  { icon: Brain, label: 'Extracting medicine details...', duration: 700 },
  { icon: Pill, label: 'Medicine detection...', duration: 500 },
]

const medicineTypes = [
  'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Other',
]

const diseaseCategories = [
  'Blood Pressure', 'Diabetes', 'Thyroid', 'Antibiotics', 'Vitamins', 'Heart Medications', 'General', 'Other',
]

const frequencyOptions = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'thrice_daily', label: 'Three times daily' },
  { value: 'four_times_daily', label: 'Four times daily' },
  { value: 'bedtime', label: 'At bedtime' },
  { value: 'as_needed', label: 'As needed (PRN)' },
]

const frequencyLabels = Object.fromEntries(frequencyOptions.map(o => [o.value, o.label]))

const frequencySlotCount = {
  once_daily: 1,
  twice_daily: 2,
  thrice_daily: 3,
  four_times_daily: 4,
  bedtime: 1,
  as_needed: 1,
}

const DEFAULT_TIME = '08:00'

export default function AIScanner() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [medicines, setMedicines] = useState([])
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState({})
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef(null)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const animateSteps = () =>
    new Promise((resolve) => {
      let step = 0
      const runStep = () => {
        if (step < scanningSteps.length) {
          setCurrentStep(step)
          setTimeout(() => {
            step++
            runStep()
          }, scanningSteps[step]?.duration || 600)
        } else {
          resolve()
        }
      }
      runStep()
    })

  const applyScanResult = (resData) => {
    const detected = (resData.medicines || []).map((m) => ({
      name: m.name || '',
      dosage: m.dosage ?? '',
      dosage_unit: m.dosage_unit || '',
      medicine_type: m.medicine_type || 'Tablet',
      disease_category: m.disease_category || 'General',
      quantity: m.quantity ?? 30,
      quantity_per_dose: m.quantity_per_dose ?? 1,
      frequency: m.frequency || 'once_daily',
      instructions: m.instructions || '',
      times: Array.isArray(m.times) && m.times.length ? m.times : [DEFAULT_TIME],
      confidence: m.confidence ?? 0.8,
    }))
    setMedicines(detected)
    setRawText(resData.raw_text || '')
    setWarning(resData.warning || '')
    setResultMessage(resData.message || '')
    const sel = {}
    detected.forEach((_, i) => { sel[i] = true })
    setSelected(sel)
    setCompleted(true)
    setScanning(false)
  }

  const handleParseText = async () => {
    if (!pasteText.trim()) return
    setFile({ name: 'pasted-text.txt' })
    setPreview(null)
    setScanning(true)
    setCurrentStep(0)
    setCompleted(false)
    setError('')
    setWarning('')
    setResultMessage('')
    setMedicines([])
    const stepsPromise = animateSteps()
    try {
      const res = await API.post('/ocr/parse-text', { text: pasteText })
      await stepsPromise
      applyScanResult(res.data)
    } catch (err) {
      await stepsPromise
      setError(err.response?.data?.detail || 'Text parsing failed')
      setCompleted(true)
      setScanning(false)
    }
  }

  const handleFile = async (f) => {
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    const isImage = f.type?.startsWith('image/')
    setPreview(isImage ? URL.createObjectURL(f) : null)
    setScanning(true)
    setCurrentStep(0)
    setCompleted(false)
    setError('')
    setWarning('')
    setResultMessage('')
    setMedicines([])
    setSelected({})

    const stepsPromise = animateSteps()

    try {
      const form = new FormData()
      form.append('file', f)
      const res = await API.post('/ocr/scan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await stepsPromise
      applyScanResult(res.data)
    } catch (err) {
      await stepsPromise
      setError(err.response?.data?.detail || 'Prescription scan failed. Please try another image or paste text.')
      setCompleted(true)
      setScanning(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setScanning(false)
    setCompleted(false)
    setCurrentStep(0)
    setMedicines([])
    setRawText('')
    setError('')
    setWarning('')
    setResultMessage('')
    setSelected({})
    setPasteText('')
  }

  const toggleSelect = (idx) => {
    setSelected((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const updateField = (idx, field, value) => {
    setMedicines((prev) => prev.map((m, i) => (i !== idx ? m : { ...m, [field]: value })))
  }

  const updateFrequency = (idx, freq) => {
    setMedicines((prev) => prev.map((m, i) => {
      if (i !== idx) return m
      const count = frequencySlotCount[freq] || 1
      let times = [...m.times]
      while (times.length < count) times.push(DEFAULT_TIME)
      times = times.slice(0, count)
      return { ...m, frequency: freq, times }
    }))
  }

  const updateTime = (idx, timeIdx, value) => {
    setMedicines((prev) => prev.map((m, i) => {
      if (i !== idx) return m
      const times = [...m.times]
      times[timeIdx] = value
      return { ...m, times }
    }))
  }

  const addTime = (idx) => {
    setMedicines((prev) => prev.map((m, i) => (i !== idx ? m : { ...m, times: [...m.times, DEFAULT_TIME] })))
  }

  const removeTime = (idx) => {
    setMedicines((prev) => prev.map((m, i) => (i !== idx || m.times.length <= 1 ? m : { ...m, times: m.times.slice(0, -1) })))
  }

  const handleSave = async () => {
    const toSave = medicines.filter((_, i) => selected[i])
    if (!toSave.length) {
      setError('Select at least one medicine to save')
      return
    }
    setSaving(true)
    setError('')
    try {
      for (const m of toSave) {
        const quantity = Number(m.quantity) || 0
        await API.post('/medicines', {
          name: m.name.trim(),
          dosage: String(m.dosage ?? '').trim(),
          dosage_unit: m.dosage_unit || '',
          medicine_type: m.medicine_type || 'Tablet',
          disease_category: m.disease_category || 'General',
          instructions: m.instructions || '',
          quantity_total: quantity,
          stock_remaining: quantity,
          quantity_per_dose: Number(m.quantity_per_dose) || 1,
          schedules: (m.times || []).map((t) => ({ reminder_time: t, days_of_week: null })),
        })
      }
      window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
      navigate('/add-medicine')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save medicines')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input`
  const selectCls = `${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-select`
  const labelCls = `block text-xs font-medium mb-1 ${isLight ? 'text-navy-500' : 'text-white/50'}`

  const renderMedicineCard = (med, i) => (
    <div
      key={`${med.name}-${i}`}
      className={`rounded-3xl border p-4 transition-colors ${
        selected[i]
          ? isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-500/[0.06] border-emerald-500/30'
          : isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card border-white/[0.08]'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={!!selected[i]}
          onChange={() => toggleSelect(i)}
          className="rounded"
        />
        <Pill className={`w-5 h-5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
        <div className="flex-1 text-left min-w-0">
          <p className={`text-sm font-medium truncate ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
            {med.name || 'Unnamed medicine'} {med.dosage}{med.dosage_unit ? ` ${med.dosage_unit}` : ''}
          </p>
          <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            {frequencyLabels[med.frequency] || med.frequency} · Qty {med.quantity} · {med.disease_category}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
          isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {Math.round((med.confidence || 0.8) * 100)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Medicine Name</label>
          <input
            type="text"
            value={med.name}
            onChange={(e) => updateField(i, 'name', e.target.value)}
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Dosage</label>
          <input
            type="text"
            value={med.dosage}
            placeholder="e.g. 500"
            onChange={(e) => updateField(i, 'dosage', e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Unit</label>
          <select
            value={med.dosage_unit}
            onChange={(e) => updateField(i, 'dosage_unit', e.target.value)}
            className={selectCls}
          >
            <option value="" className={isLight ? 'bg-white' : 'bg-navy-800'}>Select</option>
            <option value="mg" className={isLight ? 'bg-white' : 'bg-navy-800'}>mg</option>
            <option value="g" className={isLight ? 'bg-white' : 'bg-navy-800'}>g</option>
            <option value="mcg" className={isLight ? 'bg-white' : 'bg-navy-800'}>mcg</option>
            <option value="ml" className={isLight ? 'bg-white' : 'bg-navy-800'}>ml</option>
            <option value="IU" className={isLight ? 'bg-white' : 'bg-navy-800'}>IU</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Type</label>
          <select
            value={med.medicine_type}
            onChange={(e) => updateField(i, 'medicine_type', e.target.value)}
            className={selectCls}
          >
            {medicineTypes.map((t) => (
              <option key={t} value={t} className={isLight ? 'bg-white' : 'bg-navy-800'}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Condition / Category</label>
          <select
            value={med.disease_category}
            onChange={(e) => updateField(i, 'disease_category', e.target.value)}
            className={selectCls}
          >
            {diseaseCategories.map((t) => (
              <option key={t} value={t} className={isLight ? 'bg-white' : 'bg-navy-800'}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Frequency</label>
          <select
            value={med.frequency}
            onChange={(e) => updateFrequency(i, e.target.value)}
            className={selectCls}
          >
            {frequencyOptions.map((o) => (
              <option key={o.value} value={o.value} className={isLight ? 'bg-white' : 'bg-navy-800'}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Quantity</label>
          <input
            type="number"
            min="0"
            value={med.quantity}
            onChange={(e) => updateField(i, 'quantity', e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Qty per dose</label>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={med.quantity_per_dose}
            onChange={(e) => updateField(i, 'quantity_per_dose', e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Reminder times</label>
          <div className="space-y-2">
            {med.times.map((t, timeIdx) => (
              <div key={timeIdx} className="flex items-center gap-2">
                <Clock className={`w-4 h-4 shrink-0 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                <input
                  type="time"
                  value={t}
                  onChange={(e) => updateTime(i, timeIdx, e.target.value)}
                  className={`flex-1 ${inputCls} py-2`}
                />
                {med.times.length > 1 && (
                  <button
                    onClick={() => removeTime(i)}
                    className={`p-2 rounded-xl transition-colors ${isLight ? 'text-red-400 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => addTime(i)}
            className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-500' : 'text-emerald-400 hover:text-emerald-300'}`}
          >
            <Plus className="w-3.5 h-3.5" /> Add another time
          </button>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Instructions</label>
          <input
            type="text"
            value={med.instructions}
            placeholder="e.g. after meals"
            onChange={(e) => updateField(i, 'instructions', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>AI Prescription Scanner</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Upload a prescription photo and extract medication details with AI.</p>
      </motion.div>

      <div className={`flex-1 min-h-0 rounded-3xl overflow-hidden border ${
        isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card border-white/[0.08]'
      }`}>
        <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-2 ${
          isLight ? 'border-navy-100 bg-gradient-to-r from-violet-50 to-purple-50' : 'border-white/[0.06] bg-gradient-to-r from-violet-500/5 to-purple-500/5'
        }`}>
          <ScanLine className={`w-4 h-4 ${isLight ? 'text-violet-500' : 'text-violet-400'}`} />
          <span className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>AI prescription extraction</span>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          {error && (
            <div className={`mb-4 p-3 rounded-2xl text-sm flex items-center gap-2 ${
              isLight ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {!file ? (
            <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-10 md:p-16 text-center transition-all duration-300 overflow-hidden ${
                dragOver
                  ? 'border-violet-400 bg-violet-500/10 scale-[1.02]'
                  : isLight
                    ? 'border-navy-200 hover:border-violet-400 hover:bg-violet-50/50'
                    : 'border-white/[0.12] hover:border-violet-500/40 hover:bg-white/[0.04]'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <PrescriptionIllustration className="w-32 h-32 mx-auto mb-5" />
              <h3 className={`text-xl font-semibold mb-2 ${isLight ? 'text-navy-700' : 'text-white'}`}>Upload Prescription</h3>
              <p className={`text-sm mb-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Drag & drop or click to browse</p>
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium border ${
                isLight ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
              }`}>
                <Upload className="w-4 h-4" /> Choose File
              </span>
              <div className={`mt-4 flex items-center justify-center gap-4 text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> PNG</span>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> JPG</span>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> WEBP</span>
              </div>
            </div>

            <div className="mt-6">
              <p className={`text-xs mb-2 text-center ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                Or paste prescription text
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Metformin 500mg twice daily Qty 60"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className={`${isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : ''} glass-input resize-none`}
              />
              <button
                onClick={handleParseText}
                disabled={!pasteText.trim() || scanning}
                className="btn-primary w-full mt-3"
              >
                <Brain className="w-4 h-4" /> Extract from Text
              </button>
            </div>
            </>
          ) : (
            <div className="space-y-6">
              {preview ? (
                <div className={`rounded-3xl overflow-hidden border relative ${isLight ? 'border-navy-100 bg-navy-50' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <img src={preview} alt="Prescription preview" className="w-full h-48 object-contain" />
                  {scanning && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <motion.div
                        animate={{ top: ['-10%', '110%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                        style={{ filter: 'blur(4px)' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-3xl border p-6 text-center ${isLight ? 'border-navy-100 bg-navy-50' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <FileImage className={`w-10 h-10 mx-auto mb-2 ${isLight ? 'text-navy-300' : 'text-white/30'}`} />
                  <p className={`text-sm ${isLight ? 'text-navy-500' : 'text-white/50'}`}>{file?.name}</p>
                </div>
              )}

              <AnimatePresence>
                {scanning && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 py-4">
                    {scanningSteps.map((step, i) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                          i < currentStep ? (isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400') :
                          i === currentStep ? (isLight ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-400') :
                          (isLight ? 'bg-navy-50 text-navy-300' : 'bg-white/[0.04] text-white/20')
                        }`}>
                          {i < currentStep ? <CheckCircle className="w-4 h-4" /> : <step.icon className={`w-4 h-4 ${i === currentStep ? 'animate-pulse' : ''}`} />}
                        </div>
                        <span className={`text-sm ${i === currentStep ? (isLight ? 'text-navy-700 font-medium' : 'text-white font-medium') : i < currentStep ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-navy-300' : 'text-white/20')}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {completed && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  {medicines.length > 0 ? (
                    <>
                      <div className="text-center mb-4">
                        <CheckCircle className={`w-10 h-10 mx-auto mb-2 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
                        <h3 className={`text-xl font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>
                          {medicines.length} medicine{medicines.length !== 1 ? 's' : ''} detected
                        </h3>
                        {warning && <p className={`text-xs mt-1 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{warning}</p>}
                      </div>

                      <div className={`mb-4 p-3 rounded-2xl text-xs flex items-start gap-2 ${
                        isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          AI-extracted prescription information may contain errors. Verify medicine, dosage and schedule before adding.
                        </span>
                      </div>

                      <div className="space-y-3">
                        {medicines.map((med, i) => renderMedicineCard(med, i))}
                      </div>
                      {rawText && (
                        <details className={`mt-4 text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                          <summary className="cursor-pointer">View extracted text</summary>
                          <pre className={`mt-2 p-3 rounded-xl whitespace-pre-wrap ${isLight ? 'bg-navy-50' : 'bg-white/[0.04]'}`}>{rawText}</pre>
                        </details>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className={`w-10 h-10 mx-auto mb-2 ${isLight ? 'text-orange-500' : 'text-orange-400'}`} />
                      <h3 className={`text-lg font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>No medicines detected</h3>
                      <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/50'}`}>
                        {resultMessage || 'No medicines could be confidently identified. Try a clearer image or add the medicine manually.'}
                      </p>
                      {warning && <p className={`text-xs mt-2 ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{warning}</p>}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={reset} className="btn-secondary flex-1" disabled={scanning || saving}>
                  Scan Another
                </button>
                {medicines.length > 0 ? (
                  <button onClick={handleSave} className="btn-primary flex-1" disabled={scanning || saving}>
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Confirm & Add'}
                  </button>
                ) : (
                  <button onClick={() => navigate('/add-medicine')} className="btn-primary flex-1" disabled={scanning}>
                    Add Manually
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 shrink-0 flex items-center justify-center gap-2 text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}
        >
          <Shield className="w-3 h-3" />
          Images are processed securely for medication extraction only
        </motion.div>
      )}
    </div>
  )
}
