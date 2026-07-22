import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Pill, ArrowRight, Github, ChromeIcon as Google, Sparkles, HeartPulse, Shield } from 'lucide-react'
import { useAuth, getErrorMessage } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'

export default function Register() {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.confirm)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex relative overflow-hidden ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-violet-500/8 rounded-full blur-[120px] -top-48 -right-48 animate-blob" />
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[100px] top-1/2 -left-24 animate-blob2" style={{ animationDelay: '3s' }} />
        <div className="absolute w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[80px] bottom-0 left-1/3 animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
        <div className="relative max-w-md">
          <div className={`p-8 mb-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shadow-glow-violet"
              >
                <HeartPulse className="w-7 h-7 text-white" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center"
              >
                <Pill className="w-5 h-5 text-navy-900" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center"
              >
                <Shield className="w-5 h-5 text-white" />
              </motion.div>
            </div>
            <h2 className={`text-2xl font-bold text-center mb-3 ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Secure & Private</h2>
            <p className={`text-center text-sm leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Your medical data is encrypted and private. Start your journey to better medication management.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Sparkles, text: 'AI-Powered Insights', color: 'emerald' },
                { icon: Shield, text: 'End-to-End Encryption', color: 'violet' },
                { icon: User, text: 'Personalized Dashboard', color: 'cyan' },
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
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-6 h-2 rounded-full bg-violet-400/60" />
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-400 to-pink-400 mb-4 shadow-glow-violet">
              <User className="w-7 h-7 text-white" />
            </div>
            <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Create account</h1>
            <p className={`mt-2 ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>Get started with your free account</p>
          </div>

          <div className={`p-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            {success ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Account Created!</h3>
                <p className={`text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>Redirecting to login...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Full Name</label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'name' ? (theme === 'light' ? 'text-violet-500' : 'text-violet-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                    <input
                      type="text"
                      placeholder="Alex Rivera"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Email</label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'email' ? (theme === 'light' ? 'text-violet-500' : 'text-violet-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
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
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'password' ? (theme === 'light' ? 'text-violet-500' : 'text-violet-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                    <input
                      type={show ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 pr-11`}
                      required
                      minLength={6}
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

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Confirm Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'light' ? 'text-navy-300' : 'text-white/30'}`} />
                    <input
                      type={show ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11`}
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className={`btn-primary w-full py-3.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 shadow-glow-violet ${theme === 'light' ? 'shadow-md shadow-violet-200' : ''}`}
                >
                  {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            )}

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
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
