import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, Pill, AlertTriangle, Book, MessageCircle, Brain, Clock } from 'lucide-react'
import { aiSuggestedPrompts, aiChatHistory } from '../data'
import { useTheme } from '../components/ThemeContext'
import { AIBotIllustration } from '../components/illustrations'
import API from '../api'

function ChatMessage({ role, text }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: isUser ? 10 : -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0 mt-1 shadow-glow-emerald">
          <Bot className="w-5 h-5 text-navy-900" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-tr-md'
            : isLight
              ? 'bg-navy-50 text-navy-700 rounded-tl-md'
              : 'glass text-white/80 rounded-tl-md'
        }`}>
          {text}
        </div>
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
          <MessageCircle className="w-5 h-5 text-emerald-400" />
        </div>
      )}
    </motion.div>
  )
}

function SuggestedPrompt({ text, onClick }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(text)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm transition-all duration-200 whitespace-nowrap ${
        isLight
          ? 'border border-navy-200 text-navy-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
          : 'border border-white/[0.10] text-white/60 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10'
      }`}
    >
      <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
      {text}
    </motion.button>
  )
}

function EmptyState({ onPrompt }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-6">
          <AIBotIllustration className="w-32 h-32 mx-auto" />
        </div>
        <h3 className={`text-xl font-semibold mb-2 ${isLight ? 'text-navy-700' : 'text-white'}`}>AI Medication Assistant</h3>
        <p className={`text-sm leading-relaxed max-w-sm mx-auto ${isLight ? 'text-navy-400' : 'text-white/50'}`}>
          Ask me anything about your medications — dosages, side effects, interactions, and more.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md mx-auto">
          {[
            { icon: Pill, label: 'Check Dosage', prompt: 'What are my current dosages?', color: isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { icon: AlertTriangle, label: 'Side Effects', prompt: 'What are the side effects of my medications?', color: isLight ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            { icon: Brain, label: 'Interactions', prompt: 'Any medicine interactions?', color: isLight ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
            { icon: Clock, label: 'Schedule', prompt: 'My tomorrow schedule', color: isLight ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
          ].map(({ icon: Icon, label, prompt, color }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPrompt?.(prompt)}
              className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-sm font-medium transition-all ${color} hover:scale-[1.02]`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </motion.button>
          ))}
        </div>
        <div className="mt-6">
          <p className={`text-xs mb-3 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Or try one of these questions</p>
          <div className="flex flex-wrap justify-center gap-2">
            {aiSuggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onPrompt?.(prompt)}
                className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-colors ${
                  isLight ? 'bg-navy-50 text-navy-400 border-navy-200 hover:bg-navy-100' : 'bg-white/[0.04] text-white/40 border-white/[0.06] hover:bg-white/[0.08]'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionChip({ icon: Icon, label, onClick }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all ${
        isLight
          ? 'bg-navy-50 text-navy-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 border border-navy-100'
          : 'glass text-white/60 hover:text-emerald-400 hover:border-emerald-500/30'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </motion.button>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState(aiChatHistory)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const inputRef = useRef(null)
  const [medicines, setMedicines] = useState([])

  useEffect(() => {
    API.get('/medicines').then(res => setMedicines(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = (text) => {
    const msg = text || input
    if (!msg.trim()) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: msg }])
    setIsTyping(true)

    setTimeout(() => {
      const responses = {
        'What does Aspirin do?': 'Aspirin is a nonsteroidal anti-inflammatory drug (NSAID) used to reduce pain, inflammation, and fever. At low doses (75-100mg), it is commonly used as a blood thinner to prevent heart attacks and strokes.',
        'Explain my prescription': medicines.length > 0
          ? `Based on your active medications:\n\n${medicines.map(m => `• **${m.name}** ${m.dosage}${m.dosage_unit} — ${m.schedules?.length || 0} time(s) daily`).join('\n')}\n\nAlways follow your doctor's instructions.`
          : "You don't have any medicines added yet. Add medicines in the Medicines page first.",
        'Side effects of Metformin': 'Common side effects of Metformin include nausea, diarrhea, stomach upset, and a metallic taste. These usually improve over time. Serious side effects are rare but include lactic acidosis — seek medical help if you experience muscle pain, trouble breathing, or unusual drowsiness.',
        'Medicine interactions': 'Your current medications have no major interactions. Always consult your doctor before starting new medications.',
        'My tomorrow schedule': medicines.length > 0
          ? `Your schedule:\n\n${medicines.filter(m => m.is_active).map(m => {
              const times = m.schedules?.map(s => `• **${s.reminder_time}** — ${m.name} ${m.dosage}${m.dosage_unit}`).join('\n') || ''
              return times
            }).filter(Boolean).join('\n') || 'No active schedules.'}`
          : "You don't have any medicines scheduled yet.",
        'What are my current dosages?': medicines.length > 0
          ? `Your current dosages:\n\n${medicines.map(m => `• **${m.name}**: ${m.dosage}${m.dosage_unit}`).join('\n')}\n\nAlways follow your prescribed dosage.`
          : "You don't have any medicines added yet.",
        'What are the side effects of my medications?': 'Common side effects vary by medication. Consult your doctor if symptoms persist.',
        'Any medicine interactions?': 'Your current medications have no major interactions. Always consult your doctor before starting new medications.',
      }
      const reply = responses[msg] || getGenericResponse(msg)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  const getGenericResponse = (msg) => {
    const lower = msg.toLowerCase()
    if (lower.includes('side effect')) {
      return 'I can help with side effect information! Please specify which medication you\'d like to know about.'
    }
    if (lower.includes('dose') || lower.includes('dosage') || lower.includes('how much')) {
      return medicines.length > 0
        ? `Your current dosages:\n${medicines.map(m => `• ${m.name}: ${m.dosage}${m.dosage_unit}`).join('\n')}`
        : "You don't have any medicines added yet."
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'Hello! I\'m your AI medication assistant. How can I help you today? You can ask me about your medications, dosages, side effects, or schedule.'
    }
    return `I understand your question about "${msg}". For the most accurate and personalized information, please consult your healthcare provider.`
  }

  const handlePrompt = (prompt) => {
    handleSend(prompt)
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>AI Assistant</h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>Ask questions about your medications, dosages, or schedules.</p>
      </motion.div>

      <div className={`flex flex-col flex-1 min-h-0 rounded-3xl overflow-hidden border ${
        isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card border-white/[0.08]'
      }`}>
        <div className={`shrink-0 px-4 py-3 border-b flex items-center gap-2 ${
          isLight ? 'border-navy-100 bg-gradient-to-r from-emerald-50 to-cyan-50' : 'border-white/[0.06] bg-gradient-to-r from-emerald-500/5 to-cyan-500/5'
        }`}>
          <Brain className={`w-4 h-4 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
          <span className={`text-xs ${isLight ? 'text-navy-500' : 'text-white/50'}`}>AI-powered medication assistant</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length <= 1 && !isTyping ? (
            <EmptyState onPrompt={handlePrompt} />
          ) : (
            <>
              {messages.slice(1).map((msg, i) => (
                <ChatMessage key={i} role={msg.role} text={msg.text} />
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-navy-900" />
                  </div>
                  <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${isLight ? 'bg-navy-50' : 'glass'}`}>
                    <span className="flex gap-1">
                      <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} />
                      <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} style={{ animationDelay: '0.2s' }} />
                      <span className={`w-2 h-2 rounded-full animate-typing ${isLight ? 'bg-navy-400' : 'bg-white/40'}`} style={{ animationDelay: '0.4s' }} />
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {messages.length > 1 && !isTyping && medicines.length > 0 && (
          <div className={`shrink-0 px-4 py-3 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'}`}>
            <p className={`text-xs mb-2 ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Your medicines</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {medicines.slice(0, 3).map((med) => (
                <div key={med.id} className={`flex items-center gap-3 p-3 rounded-2xl border shrink-0 ${
                  isLight ? 'bg-white border-navy-100' : 'bg-white/[0.04] border-white/[0.08]'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    <Pill className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/90'}`}>{med.name}</p>
                    <p className={`text-xs ${isLight ? 'text-navy-400' : 'text-white/40'}`}>{med.dosage}{med.dosage_unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`shrink-0 border-t ${isLight ? 'border-navy-100' : 'border-white/[0.06]'}`}>
          <div className={`px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide`}>
            <QuickActionChip icon={Pill} label="Dosage Info" onClick={() => handleSend('What are my current dosages?')} />
            <QuickActionChip icon={AlertTriangle} label="Side Effects" onClick={() => handleSend('What are the side effects of my medications?')} />
            <QuickActionChip icon={Book} label="Explain Prescription" onClick={() => handleSend('Explain my prescription')} />
            <QuickActionChip icon={Sparkles} label="Tomorrow's Schedule" onClick={() => handleSend('My tomorrow schedule')} />
          </div>

          <div className="px-4 pb-4 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about your medications..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className={`w-full pl-4 pr-4 py-3 rounded-2xl text-sm transition-all duration-200 ${
                    isLight
                      ? 'bg-navy-50 border border-navy-200 text-navy-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-navy-300'
                      : 'glass-input'
                  }`}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-emerald"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {messages.length <= 1 && !isTyping && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {aiSuggestedPrompts.map((prompt) => (
                  <SuggestedPrompt key={prompt} text={prompt} onClick={handlePrompt} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
