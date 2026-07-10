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
import Settings from './pages/Settings'

function BackgroundBlobs() {
  const { theme } = useTheme()
  if (theme === 'light') return null
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="blob w-[600px] h-[600px] bg-emerald-500/10 -top-48 -left-48" />
      <div className="blob w-[500px] h-[500px] bg-cyan-500/10 top-1/3 -right-32" style={{ animationDelay: '2s' }} />
      <div className="blob w-[400px] h-[400px] bg-violet-500/10 bottom-0 left-1/3" style={{ animationDelay: '4s' }} />
      <div className="blob w-[350px] h-[350px] bg-orange-500/8 bottom-1/4 right-1/4" style={{ animationDelay: '6s' }} />
    </div>
  )
}

function AppLayout() {
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={`flex min-h-screen ${theme === 'light' ? 'bg-[#F5F9FC]' : 'bg-navy-900'} relative`}>
      <BackgroundBlobs />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-20 lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-medicine" element={<AddMedicine />} />
            <Route path="/ai-scanner" element={<AIScanner />} />
            <Route path="/history" element={<History />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
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
