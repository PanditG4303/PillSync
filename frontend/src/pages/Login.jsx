import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Pill, ArrowRight, Github, ChromeIcon as Google, Sparkles, HeartPulse, ScanLine, Bot, Bell } from 'lucide-react'
import { useAuth, getErrorMessage } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'

export default function Login() {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex relative overflow-hidden ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px] -top-48 -left-48 animate-blob" />
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[100px] top-1/2 -right-24 animate-blob2" style={{ animationDelay: '3s' }} />
        <div className="absolute w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[80px] bottom-0 right-1/3 animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
        <div className="relative max-w-md">
          <div className={`p-8 mb-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-glow-emerald"
              >
                <Pill className="w-7 h-7 text-navy-900" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center"
              >
                <HeartPulse className="w-5 h-5 text-white" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center"
              >
                <Bot className="w-5 h-5 text-navy-900" />
              </motion.div>
            </div>
            <h2 className={`text-2xl font-bold text-center mb-3 ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>AI-Powered Healthcare</h2>
            <p className={`text-center text-sm leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Track your medications, never miss a dose, and stay on top of your health with AI-powered insights.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Sparkles, text: 'AI Prescription Scanner', color: 'emerald' },
                { icon: Bell, text: 'Smart Reminders', color: 'cyan' },
                { icon: ScanLine, text: 'Health Analytics', color: 'violet' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className={`flex items-center gap-3 p-3 rounded-2xl border ${theme === 'light' ? 'bg-navy-50 border-navy-100' : 'bg-white/[0.04] border-white/[0.06]'}`}>
                  <div className={`w-8 h-8 rounded-xl ${theme === 'light' ? 'bg-navy-100 text-navy-500' : 'bg-white/[0.06] text-white/50'} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-6 h-2 rounded-full bg-emerald-400/60" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 mb-4 shadow-glow-emerald">
              <Pill className="w-7 h-7 text-navy-900" />
            </div>
            <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Welcome back</h1>
            <p className={`mt-2 ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>Sign in to your account to continue</p>
          </div>

          <div className={`p-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Email</label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'email' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Password</label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'password' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 pr-11`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${theme === 'light' ? 'text-navy-300 hover:text-navy-500' : 'text-white/30 hover:text-white/60'}`}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className={`w-4 h-4 rounded ${theme === 'light' ? 'border-navy-200 text-emerald-500 focus:ring-emerald-500/20' : 'bg-white/[0.05] border-white/[0.15] text-emerald-500 focus:ring-emerald-500/30'}`} />
                  <span className={`${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors text-sm">
                  Forgot password?
                </Link>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className={`btn-primary w-full py-3.5 ${theme === 'light' ? 'shadow-md shadow-emerald-200' : ''}`}
              >
                {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
              </motion.button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${theme === 'light' ? 'border-navy-100' : 'border-white/[0.08]'}`} /></div>
              <div className="relative flex justify-center"><span className={`px-3 text-xs ${theme === 'light' ? 'bg-white text-navy-400' : 'bg-navy-900 text-white/30'}`}>Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`btn-secondary py-2.5 text-xs ${theme === 'light' ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}
              >
                <Google className="w-4 h-4" /> Google
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`btn-secondary py-2.5 text-xs ${theme === 'light' ? '!bg-white !border-navy-200 !text-navy-600 hover:!bg-navy-50' : ''}`}
              >
                <Github className="w-4 h-4" /> GitHub
              </motion.button>
            </div>

            <p className={`text-center text-sm mt-6 ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
