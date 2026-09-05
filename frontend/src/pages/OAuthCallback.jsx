import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import API, { setStoredAuth } from '../api'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const failed = params.get('google') === 'error'

  useEffect(() => {
    if (failed || !token) {
      navigate('/login', { replace: true })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await API.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return
        setStoredAuth(res.data, token)
        window.location.href = '/dashboard'
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [token, failed, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-white/50">Completing Google sign-in…</p>
      </div>
    </div>
  )
}
