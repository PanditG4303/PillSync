import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Pill, ArrowRight, Sparkles, HeartPulse, ScanLine, Bot, Bell, KeyRound, Timer } from 'lucide-react'
import { useAuth, getErrorMessage } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'
import API, { API_BASE } from '../api'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function Login() {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, sendOtp, loginWithOtp } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [mode, setMode] = useState('password')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    API.get('/auth/google/status')
      .then((res) => {
        if (!cancelled) setGoogleEnabled(!!res.data.enabled)
      })
      .catch(() => {
        if (!cancelled) setGoogleEnabled(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!window.location.search.includes('google=error')) return
    setError('Google sign-in failed. Please try again or use email login.')
    const clean = window.location.pathname + window.location.search.replace(/([?&])google=error&?/, '$1').replace(/[?&]$/, '')
    window.history.replaceState(null, '', clean)
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

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

  const handleGoogle = async (e) => {
    e.preventDefault()
    setError('')
    setGoogleLoading(true)
    try {
      const res = await API.get('/auth/google/authorize')
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      setError('Google login is not available right now.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  const startResendTimer = (seconds) => {
    setResendIn(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setOtpInfo('')
    setDevOtp('')
    setOtpLoading(true)
    try {
      const res = await sendOtp(otpEmail)
      setOtpSent(true)
      setOtpInfo(res.data?.message || 'A sign-in code has been sent to your email.')
      if (res.data?.dev_otp) {
        setDevOtp(`Dev mode: code is ${res.data.dev_otp}`)
      }
      startResendTimer(res.data?.resend_after_seconds || 60)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setOtpLoading(true)
    try {
      await loginWithOtp(otpEmail, otpCode)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setOtpLoading(false)
    }
  }

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setOtpInfo('')
    setDevOtp('')
    setOtpSent(false)
    setOtpCode('')
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
            <div className={`flex items-center gap-1 p-1 mb-6 rounded-2xl border ${theme === 'light' ? 'bg-navy-50 border-navy-100' : 'bg-white/[0.04] border-white/[0.06]'}`}>
              <button
                type="button"
                onClick={() => switchMode('password')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${mode === 'password' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' : theme === 'light' ? 'text-navy-400 hover:text-navy-600' : 'text-white/50 hover:text-white/80'}`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => switchMode('otp')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${mode === 'otp' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' : theme === 'light' ? 'text-navy-400 hover:text-navy-600' : 'text-white/50 hover:text-white/80'}`}
              >
                Email OTP
              </button>
            </div>

            {mode === 'password' ? (
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

                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-px ${theme === 'light' ? 'bg-navy-100' : 'bg-white/[0.08]'}`} />
                  <span className={`text-xs ${theme === 'light' ? 'text-navy-300' : 'text-white/30'}`}>or continue with</span>
                  <div className={`flex-1 h-px ${theme === 'light' ? 'bg-navy-100' : 'bg-white/[0.08]'}`} />
                </div>
                <a
                  href="#"
                  onClick={handleGoogle}
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl border text-sm font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-white border-navy-200 text-navy-700 hover:border-navy-300 hover:shadow-md shadow-sm'
                      : 'bg-white/[0.05] border-white/[0.12] text-white/80 hover:bg-white/[0.09]'
                  } ${googleLoading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <GoogleIcon />
                  {googleLoading ? 'Contacting Google...' : 'Continue with Google'}
                </a>

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
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                {otpInfo && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                    {otpInfo}
                  </div>
                )}
                {devOtp && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm text-center font-mono">
                    {devOtp}
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Email</label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'otpEmail' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                    <input
                      type="email"
                      placeholder="you@gmail.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      onFocus={() => setFocused('otpEmail')}
                      onBlur={() => setFocused(null)}
                      className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11`}
                      required
                      disabled={otpSent}
                    />
                  </div>
                </div>

                {otpSent ? (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Enter the code from your email</label>
                      <div className="relative">
                        <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'otpCode' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="6-digit code"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          onFocus={() => setFocused('otpCode')}
                          onBlur={() => setFocused(null)}
                          className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 tracking-[0.3em] text-center`}
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-1.5 ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                        <Timer className="w-3.5 h-3.5" />
                        Code expires in 10 minutes
                      </span>
                      {resendIn > 0 ? (
                        <span className={`${theme === 'light' ? 'text-navy-300' : 'text-white/30'}`}>Resend in {resendIn}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                    No password needed. We&apos;ll email you a 6-digit code — your account is created automatically and remembered for next time.
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={otpLoading}
                  whileHover={{ scale: otpLoading ? 1 : 1.01 }}
                  whileTap={{ scale: otpLoading ? 1 : 0.99 }}
                  className={`btn-primary w-full py-3.5 ${theme === 'light' ? 'shadow-md shadow-emerald-200' : ''}`}
                >
                  {otpLoading
                    ? (otpSent ? 'Verifying...' : 'Sending...')
                    : (otpSent ? 'Verify & Sign In' : 'Send Code')}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            )}

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
