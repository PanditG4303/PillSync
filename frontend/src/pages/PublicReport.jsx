import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { Pill, CalendarCheck, Shield, ExternalLink, Loader2 } from 'lucide-react'
import { API_BASE } from '../api'
import { useTheme } from '../components/ThemeContext'

function renderLine(line, isLight, i) {
  const strong = (text) =>
    text.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong class="text-emerald-500">${t}</strong>`)
  if (line.startsWith('## ')) {
    return (
      <h3 key={i} className={`text-sm font-semibold mt-5 mb-2 ${isLight ? 'text-navy-700' : 'text-white/90'}`}>
        {line.replace(/^##\s*/, '')}
      </h3>
    )
  }
  if (line.startsWith('- ')) {
    return (
      <li key={i} className={`text-sm leading-relaxed ml-1 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
        <span dangerouslySetInnerHTML={{ __html: strong(line.slice(2)) }} />
      </li>
    )
  }
  if (!line.trim()) return <div key={i} className="h-2" />
  return (
    <p key={i} className={`text-sm leading-relaxed ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
      <span dangerouslySetInnerHTML={{ __html: strong(line) }} />
    </p>
  )
}

export default function PublicReport() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const embed = searchParams.get('embed') === '1'
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    axios
      .get(`${API_BASE}/reports/share/${token}`)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || 'Report not found or revoked.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#F5F9FC]' : 'bg-navy-900'} relative`}>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {!embed && (
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <Pill className="w-4 h-4 text-navy-900" />
              </div>
              <span className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white'}`}>PillSync</span>
            </div>
            <Link to="/" className={`text-xs flex items-center gap-1 ${isLight ? 'text-navy-400 hover:text-emerald-600' : 'text-white/40 hover:text-emerald-400'}`}>
              <ExternalLink className="w-3.5 h-3.5" /> Open PillSync
            </Link>
          </header>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className={`w-6 h-6 animate-spin ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          </div>
        ) : error ? (
          <div className={`p-8 rounded-3xl border text-center ${isLight ? 'bg-white border-navy-100' : 'glass-card'}`}>
            <Shield className={`w-10 h-10 mx-auto mb-3 ${isLight ? 'text-red-400' : 'text-red-400'}`} />
            <h2 className={`text-lg font-semibold mb-1 ${isLight ? 'text-navy-700' : 'text-white'}`}>Report unavailable</h2>
            <p className={`text-sm ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{error}</p>
          </div>
        ) : data ? (
          <div className={`rounded-3xl border overflow-hidden ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'}`}>
            <div className={`px-6 py-5 border-b ${isLight ? 'border-navy-100 bg-gradient-to-r from-emerald-50 to-cyan-50' : 'border-white/[0.06] bg-gradient-to-r from-emerald-500/5 to-cyan-500/5'}`}>
              <p className={`text-[11px] uppercase tracking-wide ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                Shared health summary · {data.share.owner_name}
              </p>
              <h1 className={`text-xl md:text-2xl font-bold mt-1 ${isLight ? 'text-navy-800' : 'text-white'}`}>
                {data.share.title}
              </h1>
              <p className={`text-xs mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
                Generated {new Date(data.share.generated_on).toLocaleDateString()} · PillSync adherence report
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="flex flex-wrap gap-2 mb-6">
                <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <CalendarCheck className="w-3 h-3" /> {data.data.weekly.adherence}% weekly adherence
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  <Pill className="w-3 h-3" /> {data.data.active_medicines.length} active medicines
                </span>
              </div>

              <div className="space-y-1">
                {data.summary.split('\n').map((line, i) => renderLine(line, isLight, i))}
              </div>

              <div className={`mt-6 pt-4 border-t flex items-start gap-2 text-[11px] ${isLight ? 'border-navy-100 text-navy-300' : 'border-white/[0.06] text-white/25'}`}>
                <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{data.disclaimer}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
