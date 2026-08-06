import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, CheckCircle, Sparkles } from 'lucide-react'
import { useAuth, getErrorMessage } from '../components/AuthContext'
import { useTheme } from '../components/ThemeContext'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [devHint, setDevHint] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { forgotPassword, resetPassword } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await forgotPassword(email)
      setDevHint(data.message || 'If that email exists, a reset token was issued.')
      if (data.reset_token) {
        setResetToken(data.reset_token)
      }
      setStep(2)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!resetToken.trim()) {
      setError('Reset token is required')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must include letters and numbers')
      return
    }
    setLoading(true)
    try {
      await resetPassword(resetToken.trim(), newPassword)
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
        <div className="absolute w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px] -top-48 -left-48 animate-blob" />
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[100px] top-1/2 -right-24 animate-blob2" style={{ animationDelay: '3s' }} />
      </div>

      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
        <div className="relative max-w-md">
          <div className={`p-8 mb-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-glow-emerald">
                <Shield className="w-7 h-7 text-navy-900" />
              </div>
            </div>
            <h2 className={`text-2xl font-bold text-center mb-3 ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Secure reset</h2>
            <p className={`text-center text-sm leading-relaxed ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              Password resets use a one-time token. In development the token is returned in the API response; in production it is emailed.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Mail, text: 'Request a reset token' },
                { icon: Sparkles, text: 'Enter token + new password' },
                { icon: CheckCircle, text: 'Sign in with new password' },
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-500 mb-4 shadow-glow-emerald">
              <Lock className="w-7 h-7 text-navy-900" />
            </div>
            <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Forgot Password</h1>
            <p className={`mt-2 ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>
              {step === 1 ? 'Enter your email to request a reset' : 'Enter your token and new password'}
            </p>
          </div>

          <div className={`p-8 rounded-3xl border ${theme === 'light' ? 'bg-white border-navy-100 shadow-lg' : 'glass-card'}`}>
            {success ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-navy-800' : 'text-white'}`}>Password Reset!</h3>
                <p className={`text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/50'}`}>Redirecting to login...</p>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleRequestToken} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Email</label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${focused === 'email' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
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
                  className={`btn-primary w-full py-3.5 ${theme === 'light' ? 'shadow-md shadow-emerald-200' : ''}`}
                >
                  {loading ? 'Sending...' : 'Request Reset'} <ArrowRight className="w-4 h-4" />
                </motion.button>

                <p className={`text-center text-sm mt-4 ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>
                  Remember your password?{' '}
                  <Link to="/login" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
                    Sign in
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                {devHint && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {devHint}
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>Reset token</label>
                  <input
                    type="text"
                    placeholder="Paste reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-navy-600' : 'text-white/70'}`}>New Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${focused === 'password' ? (theme === 'light' ? 'text-emerald-500' : 'text-emerald-400') : (theme === 'light' ? 'text-navy-300' : 'text-white/30')}`} />
                    <input
                      type={show ? 'text' : 'password'}
                      placeholder="Min. 8 chars, letters + numbers"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      className={`${theme === 'light' ? 'bg-navy-50 border-navy-200 text-navy-700 placeholder:text-navy-300' : ''} glass-input pl-11 pr-11`}
                      required
                      minLength={8}
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

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className={`btn-primary w-full py-3.5 ${theme === 'light' ? 'shadow-md shadow-emerald-200' : ''}`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'} <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
