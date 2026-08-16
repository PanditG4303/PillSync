import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import { ThemeProvider, useTheme } from './components/ThemeContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import API from './api'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AddMedicine = lazy(() => import('./pages/AddMedicine'))
const AIScanner = lazy(() => import('./pages/AIScanner'))
const History = lazy(() => import('./pages/History'))
const AIAssistant = lazy(() => import('./pages/AIAssistant'))
const Reports = lazy(() => import('./pages/Reports'))
const Refills = lazy(() => import('./pages/Refills'))
const Settings = lazy(() => import('./pages/Settings'))
const HealthMonitor = lazy(() => import('./pages/HealthMonitor'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const Reminders = lazy(() => import('./pages/Reminders'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const PublicReport = lazy(() => import('./pages/PublicReport'))

function BackgroundBlobs() {
  const { theme } = useTheme()
  if (theme === 'light') return null
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="blob w-[600px] h-[600px] bg-emerald-500/10 -top-48 -left-48" />
      <div className="blob w-[500px] h-[500px] bg-cyan-500/10 top-1/3 -right-32" style={{ animationDelay: '2s' }} />
      <div className="blob w-[400px] h-[400px] bg-violet-500/10 bottom-0 left-1/3" style={{ animationDelay: '4s' }} />
    </div>
  )
}

function BootSplash() {
  const { theme } = useTheme()
  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'}`}>
      <div className={`text-sm ${theme === 'light' ? 'text-navy-400' : 'text-white/40'}`}>Loading PillSync…</div>
    </div>
  )
}

function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.75)
  } catch {
    /* audio unavailable */
  }
}

function useReminderAlerts() {
  const { isAuthenticated } = useAuth()
  const seen = useRef(new Set())

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    const check = async () => {
      try {
        const res = await API.get('/notifications?limit=8')
        const items = res.data?.notifications || []
        for (const n of items) {
          if (cancelled) return
          if (n.is_read || (n.type !== 'reminder' && n.type !== 'refill')) continue
          if (seen.current.has(n.id)) continue
          seen.current.add(n.id)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(n.title || 'PillSync', { body: n.body || '', icon: '/favicon.svg' })
            } catch {
              /* fall through to tone only */
            }
          }
          playAlertTone()
          window.dispatchEvent(new CustomEvent('pillsync:reminders-updated'))
        }
      } catch {
        /* transient network error — try again next poll */
      }
    }
    check()
    const poll = setInterval(check, 20000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [isAuthenticated])
}

function AppLayout() {
  const { isAuthenticated, bootstrapping } = useAuth()
  const { theme } = useTheme()
  const setupRan = useRef(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useReminderAlerts()

  useEffect(() => {
    if (!isAuthenticated) return
    if (setupRan.current) return
    setupRan.current = true
    let cancelled = false
    import('./firebase').then(async (m) => {
      if (cancelled || !m.isFirebaseConfigured()) return
      m.initFirebase()
      m.onForegroundMessage((payload) => {
        const data = payload.data || {}
        const notification = payload.notification || {}
        const title = notification.title || data.title || 'Medicine Reminder'
        const body = notification.body || data.body || 'Time to take your medicine'
        if (document.visibilityState !== 'visible') {
          const swReg = m.getSwRegistration()
          if (swReg) {
            swReg.showNotification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
          } else if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' })
          }
        }
        window.dispatchEvent(new CustomEvent('pillsync:reminders-updated', { detail: payload }))
      })
      await m.requestNotificationPermission()
    })
    return () => { cancelled = true }
  }, [isAuthenticated])

  if (bootstrapping) return <BootSplash />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className={`flex min-h-screen ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'} relative`}>
      <BackgroundBlobs />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 md:ml-20 lg:ml-64 transition-all duration-300">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          <Suspense fallback={<BootSplash />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-medicine" element={<AddMedicine />} />
              <Route path="/medicines" element={<AddMedicine />} />
              <Route path="/ai-scanner" element={<AIScanner />} />
              <Route path="/history" element={<History />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/refills" element={<Refills />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/health" element={<HealthMonitor />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function PublicRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth()
  if (bootstrapping) return <BootSplash />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Suspense fallback={<BootSplash />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="/public/report/:token" element={<PublicReport />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  )
}