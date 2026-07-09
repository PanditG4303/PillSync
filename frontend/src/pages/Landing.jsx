import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pill, ArrowRight, ScanLine, HeartPulse, Bot, Menu, X,
  CheckCircle, Sparkles, ChevronRight
} from 'lucide-react'
import { landingFeatures, howItWorks } from '../data'
import { useAuth } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] } }),
}

export default function Landing() {
  const navigate = useNavigate()
  const { guestLogin } = useAuth()
  const { theme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleGuestLogin = () => {
    guestLogin()
    navigate('/dashboard')
  }

  return (
    <div className={`min-h-screen overflow-hidden ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -top-48 -left-48 animate-blob" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] top-1/3 -right-32 animate-blob2" style={{ animationDelay: '3s' }} />
        <div className="absolute w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[80px] bottom-0 left-1/3 animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? theme === 'light'
            ? 'bg-white/80 backdrop-blur-2xl border-b border-navy-100'
            : 'bg-navy-900/80 backdrop-blur-2xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-glow-emerald">
                <Pill className="w-5 h-5 text-navy-900" />
              </div>
              <span className="text-lg font-bold text-gradient">PillSync</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className={`text-sm font-medium ${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/50 hover:text-white/90'} transition-colors`}>Features</a>
              <a href="#how-it-works" className={`text-sm font-medium ${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/50 hover:text-white/90'} transition-colors`}>How it Works</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className={`btn-ghost text-sm ${theme === 'light' ? '!text-navy-400 hover:!text-navy-700 hover:!bg-navy-50' : ''}`}>Log in</Link>
              <Link to="/register" className="btn-primary text-sm">Get Started</Link>
            </div>

            <button className={`md:hidden p-2 ${theme === 'light' ? 'text-navy-400' : 'text-white/70'}`} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`md:hidden border-t ${theme === 'light' ? 'border-navy-100 bg-white/95' : 'border-white/[0.06] bg-navy-900/95'} backdrop-blur-xl px-4 py-4 space-y-3`}>
            <a href="#features" className={`block text-sm font-medium py-2 ${theme === 'light' ? 'text-navy-500' : 'text-white/60'}`} onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className={`block text-sm font-medium py-2 ${theme === 'light' ? 'text-navy-500' : 'text-white/60'}`} onClick={() => setMenuOpen(false)}>How it Works</a>
            <div className={`pt-3 border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} space-y-2`}>
              <Link to="/login" className="block w-full text-center btn-secondary text-sm" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/register" className="block w-full text-center btn-primary text-sm" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </div>
          </motion.div>
        )}
      </header>

      <section className="relative pt-32 md:pt-44 pb-24 md:pb-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/20 mb-6"
              >
                <Sparkles className="w-4 h-4" /> AI-Powered Healthcare Platform
              </motion.div>
              <h1 className={`text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>
                AI Powered{' '}
                <span className="text-gradient">Medication</span>{' '}
                Companion
              </h1>
              <p className={`mt-6 text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
                Never miss a dose again. PillSync uses advanced AI to help you manage medications,
                track adherence, and stay on top of your health journey.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link to="/register" className="btn-primary px-8 py-4 text-base w-full sm:w-auto shadow-glow-emerald">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={handleGuestLogin} className={`btn-secondary px-8 py-4 text-base w-full sm:w-auto ${theme === 'light' ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}>
                  Guest Demo
                </button>
              </div>
              <div className={`mt-10 flex items-center gap-8 justify-center lg:justify-start text-sm ${theme === 'light' ? '' : ''}`}>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>10K+</p>
                  <p className={`${theme === 'light' ? 'text-navy-400' : 'text-white/40'} text-xs mt-1`}>Active Users</p>
                </div>
                <div className={`w-px h-10 ${theme === 'light' ? 'bg-navy-200' : 'bg-white/[0.08]'}`} />
                <div className="text-center">
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>94%</p>
                  <p className={`${theme === 'light' ? 'text-navy-400' : 'text-white/40'} text-xs mt-1`}>Adherence Rate</p>
                </div>
                <div className={`w-px h-10 ${theme === 'light' ? 'bg-navy-200' : 'bg-white/[0.08]'}`} />
                <div className="text-center">
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>4.9★</p>
                  <p className={`${theme === 'light' ? 'text-navy-400' : 'text-white/40'} text-xs mt-1`}>User Rating</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:flex justify-center relative"
            >
              <div className="relative w-full max-w-lg">
                <div className={`p-6 space-y-4 relative z-10 rounded-3xl border ${
                  theme === 'light' ? 'bg-white border-navy-100 shadow-xl' : 'glass-card'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-navy-900" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>Today's Medicines</p>
                        <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>4 doses remaining</p>
                      </div>
                    </div>
                    <span className={`badge-emerald ${theme === 'light' ? '!bg-emerald-100 !text-emerald-700 !border-emerald-200' : ''} text-xs`}>Active</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'Aspirin', dose: '100mg', time: '08:00 PM', color: 'emerald' },
                      { name: 'Metformin', dose: '500mg', time: '01:00 PM', color: 'cyan' },
                      { name: 'Vitamin D', dose: '2000 IU', time: '08:00 AM', color: 'violet' },
                    ].map((med, i) => (
                      <motion.div
                        key={med.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.15 }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border ${theme === 'light' ? 'bg-navy-50 border-navy-100' : 'bg-white/[0.04] border-white/[0.06]'}`}
                      >
                        <div className={`w-8 h-8 rounded-xl ${theme === 'light' ? `bg-${med.color}-100` : `bg-${med.color}-500/20`} flex items-center justify-center`}>
                          <Pill className={`w-4 h-4 ${theme === 'light' ? `text-${med.color}-600` : `text-${med.color}-400`}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${theme === 'light' ? 'text-navy-700' : 'text-white/90'}`}>{med.name} <span className={theme === 'light' ? 'text-navy-400' : 'text-white/40'}>{med.dose}</span></p>
                          <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/30'}`}>{med.time}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className={`pt-3 border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} flex items-center justify-between`}
                  >
                    <span className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>Adherence Score</span>
                    <span className="text-sm font-bold text-emerald-400">94%</span>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                  className={`absolute -right-8 -bottom-6 p-4 z-20 rounded-3xl border ${
                    theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>AI Assistant</p>
                      <p className={`text-sm font-medium ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>Ask me anything!</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                  className={`absolute -left-10 top-12 p-3 z-20 rounded-2xl border ${
                    theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-cyan-400" />
                    <span className={`text-xs ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Prescription Scanned</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className={`absolute inset-0 ${theme === 'light' ? 'bg-gradient-to-b from-[#F5F9FC] via-white to-[#F5F9FC]' : 'bg-gradient-to-b from-navy-900 via-navy-800/50 to-navy-900'}`} />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`text-3xl md:text-5xl font-bold ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>
              Everything you need to manage{' '}
              <span className="text-gradient">medications</span>
            </h2>
            <p className={`mt-4 text-lg max-w-2xl mx-auto ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Powerful features designed to make medication management effortless and intelligent.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {landingFeatures.map(({ icon: Icon, title, desc, module }, i) => {
              const gradients = [
                'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
                'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
                'from-violet-500/20 to-violet-500/5 border-violet-500/20',
                'from-orange-500/20 to-orange-500/5 border-orange-500/20',
                'from-pink-500/20 to-pink-500/5 border-pink-500/20',
                'from-emerald-500/20 to-cyan-500/5 border-emerald-500/20',
              ]
              const lightGradients = [
                'bg-white border-emerald-200',
                'bg-white border-cyan-200',
                'bg-white border-violet-200',
                'bg-white border-orange-200',
                'bg-white border-pink-200',
                'bg-white border-emerald-200',
              ]
              const iconColors = [
                'text-emerald-400 bg-emerald-500/20',
                'text-cyan-400 bg-cyan-500/20',
                'text-violet-400 bg-violet-500/20',
                'text-orange-400 bg-orange-500/20',
                'text-pink-400 bg-pink-500/20',
                'text-emerald-400 bg-emerald-500/20',
              ]
              const lightIconColors = [
                'text-emerald-600 bg-emerald-100',
                'text-cyan-600 bg-cyan-100',
                'text-violet-600 bg-violet-100',
                'text-orange-600 bg-orange-100',
                'text-pink-600 bg-pink-100',
                'text-emerald-600 bg-emerald-100',
              ]
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`group p-6 md:p-8 relative overflow-hidden rounded-3xl border transition-all ${
                    theme === 'light'
                      ? `${lightGradients[i]} shadow-sm hover:shadow-md`
                      : `glass-card-hover bg-gradient-to-br ${gradients[i]}`
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${theme === 'light' ? lightIconColors[i] : iconColors[i]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>{title}</h3>
                  <p className={`text-sm leading-relaxed mb-4 ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>{desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                    {module} <ChevronRight className="w-3 h-3" />
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`text-3xl md:text-5xl font-bold ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>
              How{' '}
              <span className="text-gradient-violet">PillSync</span> Works
            </h2>
            <p className={`mt-4 text-lg max-w-2xl mx-auto ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Get started in three simple steps and transform your medication management.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map(({ step, title, desc, icon: Icon }, i) => {
              const gradients = ['from-emerald-500 to-emerald-600', 'from-cyan-500 to-cyan-600', 'from-violet-500 to-violet-600']
              const glowShadows = ['shadow-glow-emerald', 'shadow-glow-cyan', 'shadow-glow-violet']
              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="text-center relative"
                >
                  <div className="relative inline-flex mb-6">
                    <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center ${glowShadows[i]}`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${theme === 'light' ? 'bg-white border-emerald-300 text-emerald-600' : 'bg-navy-900 border-emerald-500/30 text-emerald-400'}`}>
                      {step}
                    </div>
                  </div>
                  <h3 className={`text-xl font-semibold mb-3 ${theme === 'light' ? 'text-navy-700' : 'text-white'}`}>{title}</h3>
                  <p className={`leading-relaxed max-w-xs mx-auto ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>{desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className={`absolute inset-0 ${theme === 'light' ? 'bg-gradient-to-r from-emerald-50 via-cyan-50 to-violet-50' : 'bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-violet-500/5'}`} />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 mb-4">
                <ScanLine className="w-3 h-3" /> AI OCR Technology
              </span>
              <h2 className={`text-3xl md:text-4xl font-bold leading-tight ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>
                AI-Powered{' '}
                <span className="text-gradient">Prescription Scanner</span>
              </h2>
              <p className={`mt-4 text-lg leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
                Just snap a photo of your prescription and our AI instantly extracts medication names,
                dosages, and instructions. No manual entry required.
              </p>
              <ul className="mt-6 space-y-3">
                {['99.9% OCR accuracy', 'Supports 50+ languages', 'Auto-fills medication details', 'Secure encrypted processing'].map((item) => (
                  <li key={item} className={`flex items-center gap-3 ${theme === 'light' ? 'text-navy-500' : 'text-white/60'}`}>
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <div className={`w-80 h-80 rounded-4xl flex items-center justify-center relative overflow-hidden group border ${
                theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'
              }`}>
                <div className={`absolute inset-0 ${theme === 'light' ? 'bg-gradient-to-br from-emerald-50 to-cyan-50' : 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10'}`} />
                <ScanLine className={`w-32 h-32 transition-all duration-500 group-hover:scale-110 ${theme === 'light' ? 'text-navy-200 group-hover:text-navy-300' : 'text-white/20 group-hover:text-white/40'}`} />
                <div className={`absolute inset-0 bg-gradient-to-t to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${theme === 'light' ? 'from-emerald-200/30' : 'from-emerald-500/10'}`} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-10 md:p-16 rounded-4xl relative overflow-hidden border ${
              theme === 'light'
                ? 'bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 border-navy-100'
                : 'glass-card bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-violet-500/10'
            }`}
          >
            <div className={`absolute inset-0 ${theme === 'light' ? 'bg-gradient-to-br from-emerald-100/50 to-cyan-100/50' : 'bg-gradient-to-br from-emerald-500/5 to-cyan-500/5'}`} />
            <HeartPulse className={`w-14 h-14 mx-auto mb-6 relative ${theme === 'light' ? 'text-emerald-500' : 'text-emerald-400'}`} />
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 relative ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>
              Ready to transform your medication management?
            </h2>
            <p className={`text-lg mb-8 max-w-lg mx-auto relative ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Join thousands of users who never miss a dose. Start your health journey today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative">
              <Link to="/register" className="btn-primary px-8 py-4 text-base shadow-glow-emerald">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={handleGuestLogin} className={`btn-secondary px-8 py-4 text-base ${theme === 'light' ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}>
                Try Guest Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className={`border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} py-16 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-navy-900" />
                </div>
                <span className="text-lg font-bold text-gradient">PillSync</span>
              </div>
              <p className={`text-sm leading-relaxed max-w-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                AI-powered medication management platform. Never miss a dose, track your adherence,
                and stay healthy with intelligent reminders and insights.
              </p>
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>Features</a></li>
                <li><a href="#how-it-works" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>How it Works</a></li>
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>Pricing</a></li>
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>About</a></li>
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>Blog</a></li>
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>Privacy</a></li>
                <li><a href="#" className={`${theme === 'light' ? 'text-navy-400 hover:text-navy-700' : 'text-white/40 hover:text-white/90'} transition-colors`}>Terms</a></li>
              </ul>
            </div>
          </div>
          <div className={`mt-12 pt-8 border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.06]'} flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/30'}`}>
            <p>&copy; {new Date().getFullYear()} PillSync. All rights reserved.</p>
            <p>Built for better healthcare</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
