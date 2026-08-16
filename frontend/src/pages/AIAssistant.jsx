import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Send, Sparkles, RefreshCw, Copy, Check, Square, Brain, Shield,
} from 'lucide-react'
import { aiSuggestedPrompts } from '../data'
import { useTheme } from '../components/ThemeContext'
import { MarkdownContent } from '../components/Markdown'
import API, { getStoredToken, API_BASE } from '../api'

function Avatar({ role }) {
  if (role === 'user') {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shrink-0">
        <Send className="w-4 h-4 text-white -rotate-45" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0 shadow-glow-emerald">
      <Bot className="w-5 h-5 text-navy-900" />
    </div>
  )
}

function MessageBubble({ msg, onRegenerate, canRegenerate }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <Avatar role={msg.role} />
      <div className={`min-w-0 flex-1 ${isUser ? 'max-w-[80%]' : 'max-w-full'}`}>
        <div
          className={`rounded-3xl px-4 py-3.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-tr-md'
              : isLight
                ? 'bg-navy-50 text-navy-700 rounded-tl-md'
                : 'glass text-white/85 rounded-tl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <>
              <MarkdownContent text={msg.text} streaming={msg.streaming} />
              {msg.streaming && (
                <span className="inline-block w-2 h-4 ml-1 align-text-bottom bg-emerald-500/70 rounded-sm animate-pulse" />
              )}
            </>
          )}
        </div>
        {!isUser && !msg.streaming && (
          <div className={`flex items-center gap-1 mt-1.5 px-1`}>
            <button
              type="button"
              onClick={copy}
              title="Copy response"
              className={`flex items-center gap-1 text-[11px] transition-colors ${isLight ? 'text-navy-300 hover:text-emerald-600' : 'text-white/30 hover:text-emerald-400'}`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {canRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                title="Regenerate response"
                className={`flex items-center gap-1 text-[11px] ml-3 transition-colors ${isLight ? 'text-navy-300 hover:text-emerald-600' : 'text-white/30 hover:text-emerald-400'}`}
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            )}
            {msg.engine && (
              <span className={`ml-auto text-[10px] ${isLight ? 'text-navy-300' : 'text-white/25'}`}>
                {msg.engine === 'rule-based' ? 'local engine' : 'Nemotron'}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TypingDots() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <Avatar role="assistant" />
      <div className={`rounded-3xl rounded-tl-md px-4 py-3.5 ${isLight ? 'bg-navy-50' : 'glass'}`}>
        <span className="flex gap-1">
          <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} />
          <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} style={{ animationDelay: '0.2s' }} />
          <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} style={{ animationDelay: '0.4s' }} />
        </span>
      </div>
    </motion.div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [disclaimer, setDisclaimer] = useState('')
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const streamIdRef = useRef(0)
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  const buildHistory = (msgs) =>
    msgs
      .filter((m) => m.role !== 'system' && m.text)
      .slice(-14)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))

  const streamChat = useCallback(async (text, historyMsgs) => {
    const streamId = ++streamIdRef.current
    setStreaming(true)
    setError('')
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: '', streaming: true, engine: '' },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    const update = (fn) => {
      if (streamIdRef.current !== streamId) return
      setMessages((prev) => {
        if (streamIdRef.current !== streamId) return prev
        const target = prev[prev.length - 1]
        if (!target || target.role !== 'assistant') return prev
        const next = [...prev]
        next[next.length - 1] = fn(target)
        return next
      })
    }

    try {
      const res = await fetch(`${API_BASE}/assistant/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({
          message: text,
          history: buildHistory(historyMsgs),
        }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload) continue
          if (payload === '[DONE]') continue
          try {
            const event = JSON.parse(payload)
            if (event.disclaimer) setDisclaimer(event.disclaimer)
            if (event.engine && event.engine === 'rule-based') {
              update((t) => ({ ...t, text: (t.text || '') + (event.delta || ''), engine: 'rule-based' }))
            } else if (event.delta) {
              update((t) => ({ ...t, text: (t.text || '') + event.delta }))
            } else if (event.engine) {
              update((t) => ({ ...t, engine: event.engine === 'rule-based' ? 'rule-based' : 'ai' }))
            }
          } catch { /* skip malformed event */ }
        }
      }
      update((t) => ({ ...t, streaming: false }))
    } catch (err) {
      if (err.name === 'AbortError') {
        update((t) => ({ ...t, streaming: false }))
      } else {
        setError('Could not reach the AI assistant. Showing a local answer instead.')
        update((t) => ({
          ...t,
          text: t.text || 'Sorry — I could not reach the server right now. Please try again in a moment.',
          streaming: false,
          engine: 'rule-based',
        }))
      }
    } finally {
      setStreaming(false)
    }
  }, [])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || streaming) return
    setInput('')
    const userMsg = { role: 'user', text: msg }
    setMessages((prev) => [...prev, userMsg])
    await streamChat(msg, [...messages, userMsg])
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleRegenerate = async () => {
    if (streaming) return
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    const upToUser = messages.slice(0, messages.findIndex((m) => m === lastUser) + 1)
    setMessages(upToUser)
    await streamChat(lastUser.text, upToUser)
  }

  const handlePrompt = (prompt) => handleSend(prompt)

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
          AI Health <span className="text-gradient">Assistant</span>
        </h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
          Your personal medication guide — powered by context from your medicines, schedule, and refill status.
        </p>
      </motion.div>

      {error && (
        <div className={`mb-3 p-3 rounded-2xl text-sm shrink-0 ${isLight ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {error}
        </div>
      )}

      <div className={`flex flex-col flex-1 min-h-0 rounded-3xl overflow-hidden border ${
        isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card border-white/[0.08]'
      }`}>
        <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-2 ${
          isLight ? 'border-navy-100 bg-gradient-to-r from-emerald-50 to-cyan-50' : 'border-white/[0.06] bg-gradient-to-r from-emerald-500/5 to-cyan-500/5'
        }`}>
          <Brain className={`w-4 h-4 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          <span className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>PillSync Assistant · streams live answers</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messages.length === 0 && !streaming ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className={`mx-auto mb-6 w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-glow-emerald`}>
                  <Bot className="w-10 h-10 text-navy-900" />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isLight ? 'text-navy-700' : 'text-white'}`}>How can I help?</h3>
                <p className={`text-sm max-w-sm mx-auto ${isLight ? 'text-navy-400' : 'text-white/50'}`}>
                  Ask about your dosages, schedule, refill status, nutrition, sleep — or a healthy meal plan.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {aiSuggestedPrompts.map((prompt) => (
                    <motion.button
                      key={prompt}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePrompt(prompt)}
                      className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-medium text-left transition-all ${
                        isLight
                          ? 'bg-navy-50 text-navy-500 border-navy-100 hover:border-emerald-300 hover:text-emerald-600'
                          : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:border-emerald-500/30 hover:text-emerald-400'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={`${msg.role}-${i}`}
                    msg={msg}
                    canRegenerate={!streaming && msg.role === 'assistant' && i === messages.length - 1}
                    onRegenerate={handleRegenerate}
                  />
                ))}
              </AnimatePresence>
              {streaming && <TypingDots />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className={`shrink-0 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'}`}>
          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about your medications..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !streaming && handleSend()}
                  className={`w-full pl-4 pr-12 py-3.5 rounded-2xl text-sm transition-all duration-200 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-navy-300'
                      : 'glass-input'
                  }`}
                />
              </div>
              {streaming ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStop}
                  className="p-3.5 rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 transition-all"
                  title="Stop generating"
                >
                  <Square className="w-5 h-5" fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-emerald"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 px-1">
              <Shield className={`w-3 h-3 ${isLight ? 'text-navy-300' : 'text-white/25'}`} />
              <p className={`text-[10px] ${isLight ? 'text-navy-300' : 'text-white/25'}`}>
                {disclaimer || 'Responses are informational only — not medical advice. Consult your doctor for personal guidance.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}