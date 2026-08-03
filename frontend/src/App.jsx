import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import { ThemeProvider, useTheme } from './components/ThemeContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import AddMedicine from './pages/AddMedicine'
import AIScanner from './pages/AIScanner'
import History from './pages/History'
import AIAssistant from './pages/AIAssistant'
import Reports from './pages/Reports'
import Refills from './pages/Refills'
import Settings from './pages/Settings'
import AdminDashboard from './pages/AdminDashboard'

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

function AppLayout() {
  const { isAuthenticated, bootstrapping } = useAuth()
  const { theme } = useTheme()
  const setupRan = useRef(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
        // Foreground messages only arrive while the tab is open. When it is
        // visible but NOT focused, show a native notification too; when the tab
        // is focused the in-app UI (navbar badge) handles it. Background/hidden
        // tabs are handled by the service worker, so no duplicates here.
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
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-medicine" element={<AddMedicine />} />
            <Route path="/ai-scanner" element={<AIScanner />} />
            <Route path="/history" element={<History />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/refills" element={<Refills />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}
