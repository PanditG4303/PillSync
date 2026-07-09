import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanLine, Upload, FileImage, CheckCircle, Sparkles, Pill, Shield, Microscope, Brain } from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { PrescriptionIllustration } from '../components/illustrations'

const scanningSteps = [
  { icon: ScanLine, label: 'Scanning prescription...', duration: 1200 },
  { icon: Microscope, label: 'OCR extracting text...', duration: 1200 },
  { icon: Brain, label: 'AI understanding prescription...', duration: 1200 },
  { icon: Pill, label: 'Medicine detected!', duration: 800 },
]

export default function AIScanner() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setScanning(true)
    setCurrentStep(0)
    setCompleted(false)

    let step = 0
    const runStep = () => {
      if (step < scanningSteps.length) {
        setCurrentStep(step)
        setTimeout(() => {
          step++
          runStep()
        }, scanningSteps[step]?.duration || 1500)
      } else {
        setCompleted(true)
        setScanning(false)
      }
    }
    runStep()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const reset = () => {
    setFile(null)
    setPreview(null)
    setScanning(false)
    setCompleted(false)
    setCurrentStep(0)
  }

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 shrink-0">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>AI Prescription Scanner</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Upload a prescription photo and let AI extract medication details instantly.</p>
      </motion.div>

      <div className={`flex-1 min-h-0 rounded-3xl overflow-hidden border ${
        isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card border-white/[0.08]'
      }`}>
        <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-2 ${
          isLight ? 'border-navy-100 bg-gradient-to-r from-violet-50 to-purple-50' : 'border-white/[0.06] bg-gradient-to-r from-violet-500/5 to-purple-500/5'
        }`}>
          <ScanLine className={`w-4 h-4 ${isLight ? 'text-violet-500' : 'text-violet-400'}`} />
          <span className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>AI-powered prescription scanner</span>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
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
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <motion.div
                animate={dragOver ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.3 }}
                className="mx-auto mb-5"
              >
                <PrescriptionIllustration className="w-32 h-32 mx-auto" />
              </motion.div>
              <h3 className={`text-xl font-semibold mb-2 ${isLight ? 'text-navy-700' : 'text-white'}`}>Upload Prescription</h3>
              <p className={`text-sm mb-4 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Drag & drop or click to browse</p>
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium border ${
                isLight
                  ? 'bg-violet-100 text-violet-700 border-violet-200'
                  : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
              }`}>
                <Upload className="w-4 h-4" /> Choose File
              </span>
              <div className={`mt-4 flex items-center justify-center gap-4 text-xs ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> PNG</span>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> JPG</span>
                <span className="flex items-center gap-1"><FileImage className="w-3 h-3" /> PDF</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {preview && (
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
                          {i < currentStep ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : i === currentStep ? (
                            <step.icon className={`w-4 h-4 ${i === scanningSteps.length - 1 ? '' : 'animate-spin'}`} />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`text-sm transition-all duration-300 ${
                          i === currentStep ? (isLight ? 'text-navy-700 font-medium' : 'text-white font-medium') :
                          i < currentStep ? (isLight ? 'text-emerald-600' : 'text-emerald-400') :
                          (isLight ? 'text-navy-300' : 'text-white/20')
                        }`}>
                          {step.label}
                        </span>
                        {i === currentStep && (
                          <span className="ml-auto">
                            <span className="flex gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full animate-typing ${isLight ? 'bg-violet-400' : 'bg-violet-400'}`} />
                              <span className={`w-1.5 h-1.5 rounded-full animate-typing ${isLight ? 'bg-violet-400' : 'bg-violet-400'}`} style={{ animationDelay: '0.2s' }} />
                              <span className={`w-1.5 h-1.5 rounded-full animate-typing ${isLight ? 'bg-violet-400' : 'bg-violet-400'}`} style={{ animationDelay: '0.4s' }} />
                            </span>
                          </span>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {completed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isLight ? 'bg-emerald-100' : 'bg-emerald-500/20'}`}
                  >
                    <CheckCircle className={`w-10 h-10 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
                  </motion.div>
                  <h3 className={`text-xl font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>Prescription Scanned!</h3>
                  <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/50'}`}>2 medicines detected with 98% confidence.</p>
                  <div className="mt-6 space-y-3 max-w-sm mx-auto">
                    {[
                      { name: 'Aspirin 100mg', freq: 'Twice daily', color: isLight ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' },
                      { name: 'Vitamin D 2000 IU', freq: 'Once daily', color: isLight ? 'bg-cyan-100 text-cyan-600 border-cyan-200' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20' },
                    ].map((med) => (
                      <div key={med.name} className={`flex items-center gap-3 p-3 rounded-2xl border ${med.color}`}>
                        <Pill className={`w-5 h-5 ${isLight ? 'text-navy-600' : 'text-white/80'}`} />
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{med.name}</p>
                          <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{med.freq}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'}`}>98%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={reset} className="btn-secondary flex-1">
                  Scan Another
                </button>
                <button onClick={reset} className="btn-primary flex-1">
                  {completed ? 'Save Medicines' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`mt-4 shrink-0 flex items-center justify-center gap-2 text-xs ${
            isLight ? 'text-navy-400' : 'text-white/30'
          }`}
        >
          <Shield className="w-3 h-3" />
          Your images are processed securely with end-to-end encryption
        </motion.div>
      )}
    </div>
  )
}
