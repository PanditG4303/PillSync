import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Salad, Coffee, Sandwich, UtensilsCrossed, Apple, Plus, Trash2,
  Flame, Beef, Wheat, Droplet, Brain, Lightbulb, ChevronRight, Sparkles,
} from 'lucide-react'
import { useTheme } from '../components/ThemeContext'
import { MarkdownContent } from '../components/Markdown'
import API from '../api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const MEAL_TYPES = [
  { type: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'orange' },
  { type: 'lunch', label: 'Lunch', icon: Sandwich, color: 'emerald' },
  { type: 'dinner', label: 'Dinner', icon: UtensilsCrossed, color: 'violet' },
  { type: 'snacks', label: 'Snacks', icon: Apple, color: 'pink' },
]

const COLORS = {
  orange: { light: 'bg-orange-100 text-orange-600', dark: 'bg-orange-500/20 text-orange-400' },
  emerald: { light: 'bg-emerald-100 text-emerald-600', dark: 'bg-emerald-500/20 text-emerald-400' },
  violet: { light: 'bg-violet-100 text-violet-600', dark: 'bg-violet-500/20 text-violet-400' },
  pink: { light: 'bg-pink-100 text-pink-600', dark: 'bg-pink-500/20 text-pink-400' },
  cyan: { light: 'bg-cyan-100 text-cyan-600', dark: 'bg-cyan-500/20 text-cyan-400' },
  blue: { light: 'bg-blue-100 text-blue-600', dark: 'bg-blue-500/20 text-blue-400' },
}

function ProgressRow({ label, value, target, unit, icon: Icon, color = 'emerald' }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const pct = Math.max(0, Math.min(100, (value / Math.max(target, 1)) * 100))
  const gradients = {
    emerald: 'from-emerald-400 to-emerald-500',
    orange: 'from-orange-400 to-orange-500',
    violet: 'from-violet-400 to-violet-500',
    pink: 'from-pink-400 to-pink-500',
    cyan: 'from-cyan-400 to-cyan-500',
    blue: 'from-blue-400 to-blue-500',
  }
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`flex items-center gap-1.5 ${isLight ? 'text-navy-600' : 'text-white/70'}`}>
          <Icon className={`w-3.5 h-3.5 ${isLight ? 'text-navy-400' : 'text-white/40'}`} />
          {label}
        </span>
        <span className={isLight ? 'text-navy-400' : 'text-white/40'}>
          {value} / {target} {unit}
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-navy-100' : 'bg-white/[0.06]'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${gradients[color]}`}
        />
      </div>
    </div>
  )
}

function WeeklyBarChart({ labels, values, color, unit }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1.5 h-36">
      {labels.map((label, i) => {
        const height = Math.max((values[i] / max) * 100, 3)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className={`text-[9px] ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
              {values[i] > 0 ? (unit === 'kcal' ? Math.round(values[i]) : values[i]) : ''}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`w-full rounded-lg bg-gradient-to-t ${color}`}
            />
            <span className={`text-[9px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MealForm({ onSave, targetType }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [mealType, setMealType] = useState(targetType || 'breakfast')
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', water_ml: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Give your meal a name')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        meal_type: mealType,
        name: form.name.trim(),
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        water_ml: parseFloat(form.water_ml) || 0,
      })
      setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', water_ml: '' })
    } catch {
      setError('Could not save meal')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'glass-input'

  return (
    <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
      isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
          <Plus className="w-4 h-4" />
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Log a Meal</h2>
          <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>All entries are stored and charted</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {MEAL_TYPES.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            type="button"
            onClick={() => setMealType(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              mealType === type
                ? 'bg-emerald-500 text-white'
                : isLight ? 'bg-navy-50 text-navy-500 hover:bg-navy-100' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          placeholder="Meal name, e.g. Oatmeal with banana"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <input type="number" min="0" placeholder="Calories" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className={inputCls} />
          <input type="number" min="0" placeholder="Protein g" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} className={inputCls} />
          <input type="number" min="0" placeholder="Carbs g" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} className={inputCls} />
          <input type="number" min="0" placeholder="Fat g" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} className={inputCls} />
          <input type="number" min="0" placeholder="Water ml" value={form.water_ml} onChange={(e) => setForm({ ...form, water_ml: e.target.value })} className={inputCls} />
        </div>
        {error && <p className={`text-xs ${isLight ? 'text-red-600' : 'text-red-400'}`}>{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full !py-3">
          {saving ? 'Saving…' : 'Add Meal'}
        </button>
      </form>
    </motion.div>
  )
}

function MealCard({ meal, onDelete }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl ${isLight ? 'bg-navy-50/60' : 'bg-white/[0.04]'}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isLight ? 'text-navy-700' : 'text-white/85'}`}>{meal.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px]">
          <span className={isLight ? 'text-orange-500' : 'text-orange-400'}>{Math.round(meal.calories)} kcal</span>
          <span className={isLight ? 'text-pink-500' : 'text-pink-400'}>{meal.protein} g protein</span>
          <span className={isLight ? 'text-violet-500' : 'text-violet-400'}>{meal.carbs} g carbs</span>
          <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>{meal.fat} g fat</span>
          {meal.water_ml > 0 && <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>{Math.round(meal.water_ml)} ml water</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(meal.id)}
        className={`p-2 rounded-xl transition-colors ${isLight ? 'text-navy-300 hover:text-red-500 hover:bg-red-50' : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function MealSection({ type, label, icon: Icon, color, meals, onDelete }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein,
  }), { calories: 0, protein: 0 })
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isLight ? COLORS[color].light : COLORS[color].dark}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className={`text-xs font-semibold ${isLight ? 'text-navy-600' : 'text-white/70'}`}>{label}</p>
        </div>
        {totals.calories > 0 && (
          <span className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
            {Math.round(totals.calories)} kcal · {totals.protein} g protein
          </span>
        )}
      </div>
      {meals.length === 0 ? (
        <p className={`text-xs py-2 pl-9 ${isLight ? 'text-navy-300' : 'text-white/25'}`}>Nothing logged yet</p>
      ) : (
        meals.map((meal) => <MealCard key={meal.id} meal={meal} onDelete={onDelete} />)
      )}
    </div>
  )
}

export default function Nutrition() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [today, setToday] = useState(null)
  const [week, setWeek] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const [todayRes, weekRes, recRes] = await Promise.all([
        API.get('/nutrition/today'),
        API.get('/nutrition/summary?days=7'),
        API.get('/nutrition/recommendation'),
      ])
      setToday(todayRes.data)
      setWeek(weekRes.data)
      setRecommendation(recRes.data)
    } catch {
      setError('Could not load nutrition data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const saveMeal = async (payload) => {
    await API.post('/nutrition/meals', payload)
    await fetchAll()
  }

  const deleteMeal = async (id) => {
    await API.delete(`/nutrition/meals/${id}`)
    await fetchAll()
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
      <motion.div variants={itemAnim} className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-navy-800' : 'text-white'}`}>
          Food & <span className="text-gradient-violet">Nutrition</span>
        </h1>
        <p className={`text-sm mt-1 ${isLight ? 'text-navy-400' : 'text-white/40'}`}>
          Log meals, hit your daily targets, and get AI meal recommendations.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={itemAnim} className={`mb-6 p-4 rounded-3xl border text-sm ${
          isLight ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>{error}</motion.div>
      )}

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className={`skeleton h-80 ${isLight ? '!bg-navy-100' : ''}`} />
          <div className={`skeleton h-80 ${isLight ? '!bg-navy-100' : ''}`} />
          <div className={`skeleton h-80 ${isLight ? '!bg-navy-100' : ''}`} />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <MealForm onSave={saveMeal} />

            <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/20 text-orange-400'}`}>
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Today's Nutrition</h2>
                  <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Daily targets</p>
                </div>
              </div>
              <div className="space-y-4">
                <ProgressRow label="Calories" value={today?.totals?.calories || 0} target={today?.targets?.calories || 2000} unit="kcal" icon={Flame} color="orange" />
                <ProgressRow label="Protein" value={today?.totals?.protein || 0} target={today?.targets?.protein || 60} unit="g" icon={Beef} color="pink" />
                <ProgressRow label="Carbs" value={today?.totals?.carbs || 0} target={today?.targets?.carbs || 250} unit="g" icon={Wheat} color="violet" />
                <ProgressRow label="Fat" value={today?.totals?.fat || 0} target={today?.targets?.fat || 65} unit="g" icon={Droplet} color="cyan" />
                <ProgressRow label="Water" value={today?.totals?.water_ml || 0} target={today?.targets?.water_ml || 2500} unit="ml" icon={Droplet} color="blue" />
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className={`rounded-3xl border ${isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'} p-5 md:p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>AI Meal Recommendation</h2>
                  <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>
                    {recommendation?.engine === 'ai' ? 'Generated by Nemotron' : 'Based on today\'s intake'}
                  </p>
                </div>
              </div>
              <MarkdownContent text={recommendation?.recommendation || ''} />
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <motion.div variants={itemAnim} className={`lg:col-span-2 p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Today's Meals</h2>
                  <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Breakfast, lunch, dinner & snacks</p>
                </div>
                <Salad className={`w-5 h-5 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {MEAL_TYPES.map(({ type, label, icon, color }) => (
                  <MealSection key={type} type={type} label={label} icon={icon} color={color} meals={today?.by_type?.[type] || []} onDelete={deleteMeal} />
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
              isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Healthy Tips</h2>
                  <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Small habits, big wins</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {(recommendation?.tips || []).slice(0, 6).map((tip, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-2xl ${isLight ? 'bg-navy-50/60' : 'bg-white/[0.04]'}`}>
                    <span className={`text-xs font-bold mt-0.5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>{i + 1}</span>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-navy-500' : 'text-white/60'}`}>{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div variants={itemAnim} className={`p-5 md:p-6 rounded-3xl border ${
            isLight ? 'bg-white border-navy-100 shadow-sm' : 'glass-card'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-sm font-semibold ${isLight ? 'text-navy-700' : 'text-white/90'}`}>Weekly Nutrition Summary</h2>
                <p className={`text-[11px] ${isLight ? 'text-navy-400' : 'text-white/30'}`}>Last {week?.days || 7} days</p>
              </div>
              <ChevronRight className={`w-5 h-5 ${isLight ? 'text-navy-300' : 'text-white/20'}`} />
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <p className={`text-[11px] mb-2 flex items-center gap-1.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}><Flame className="w-3.5 h-3.5" /> Calories (kcal)</p>
                <WeeklyBarChart labels={week?.labels || []} values={week?.calories_series || []} color="from-orange-400 to-orange-500" unit="kcal" />
              </div>
              <div>
                <p className={`text-[11px] mb-2 flex items-center gap-1.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}><Beef className="w-3.5 h-3.5" /> Protein (g)</p>
                <WeeklyBarChart labels={week?.labels || []} values={week?.protein_series || []} color="from-pink-400 to-pink-500" unit="g" />
              </div>
              <div>
                <p className={`text-[11px] mb-2 flex items-center gap-1.5 ${isLight ? 'text-navy-400' : 'text-white/30'}`}><Droplet className="w-3.5 h-3.5" /> Water (ml)</p>
                <WeeklyBarChart labels={week?.labels || []} values={week?.water_series || []} color="from-cyan-400 to-cyan-500" unit="ml" />
              </div>
            </div>
            {week?.daily_average && (
              <div className={`mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-1 text-[11px] ${isLight ? 'text-navy-400 border-navy-100' : 'text-white/30 border-white/[0.06]'}`}>
                <span>Avg {week.daily_average.calories} kcal/day</span>
                <span>Avg {week.daily_average.protein} g protein</span>
                <span>Avg {week.daily_average.water_ml} ml water</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  )
}