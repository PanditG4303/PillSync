import {
  Pill, Bell, Target, Activity, AlertTriangle, HeartPulse,
  PlusCircle, ScanLine, BarChart3, Bot, FileText, Clock,
  Shield, User, Palette, Globe, Smartphone, Volume2, Eye,
} from 'lucide-react'

export const dashboardStats = [
  { label: "Today's Medicines",   value: '4',     sub: '2 remaining',             icon: Pill,        color: 'from-primary-500 to-emerald-500',  bg: 'bg-primary-50' },
  { label: 'Next Reminder',       value: '8:00PM', sub: 'Aspirin 100mg',           icon: Bell,        color: 'from-amber-500 to-orange-500',      bg: 'bg-amber-50' },
  { label: 'Adherence Score',     value: '94%',   sub: 'Last 7 days',              icon: Target,      color: 'from-secondary-500 to-blue-500',    bg: 'bg-secondary-50' },
  { label: 'Stock Remaining',     value: '23',    sub: 'Across 3 medicines',       icon: Activity,    color: 'from-accent-500 to-teal-500',       bg: 'bg-accent-50' },
  { label: 'Upcoming Refills',    value: '2',     sub: 'Within 7 days',            icon: AlertTriangle, color: 'from-rose-500 to-pink-500',       bg: 'bg-rose-50' },
  { label: 'AI Health Score',     value: '87',    sub: 'Excellent',                icon: HeartPulse,  color: 'from-violet-500 to-purple-500',     bg: 'bg-violet-50' },
]

export const activityTimeline = [
  { time: '2 min ago',     text: 'Took Aspirin 100mg',                     status: 'success',  icon: Pill },
  { time: '1 hr ago',      text: 'AI scanned prescription',                status: 'info',     icon: ScanLine },
  { time: '3 hrs ago',     text: 'Missed Vitamin D dose',                  status: 'danger',   icon: Clock },
  { time: '5 hrs ago',     text: 'Added Metformin 500mg',                  status: 'success',  icon: PlusCircle },
  { time: 'Yesterday',     text: 'Adherence report generated',             status: 'info',     icon: FileText },
  { time: 'Yesterday',     text: 'AI Assistant answered 3 questions',      status: 'info',     icon: Bot },
]

export const quickActions = [
  { label: 'Add Medicine',       icon: PlusCircle, to: '/add-medicine',   color: 'bg-primary-50 text-primary-600' },
  { label: 'Scan Prescription',  icon: ScanLine,   to: '/ai-scanner',     color: 'bg-secondary-50 text-secondary-600' },
  { label: 'Ask AI Assistant',   icon: Bot,        to: '/ai-assistant',   color: 'bg-accent-50 text-accent-600' },
  { label: 'View Reports',       icon: BarChart3,  to: '/reports',        color: 'bg-amber-50 text-amber-600' },
]

export const calendarEvents = [
  { date: 'Jul 8',  meds: ['Aspirin 100mg', 'Vitamin D'] },
  { date: 'Jul 9',  meds: ['Aspirin 100mg', 'Metformin 500mg', 'Vitamin D'] },
  { date: 'Jul 10', meds: ['Aspirin 100mg'] },
  { date: 'Jul 11', meds: ['Aspirin 100mg', 'Metformin 500mg'] },
  { date: 'Jul 12', meds: ['Aspirin 100mg', 'Vitamin D'] },
  { date: 'Jul 13', meds: ['Aspirin 100mg', 'Metformin 500mg', 'Vitamin D'] },
  { date: 'Jul 14', meds: ['Aspirin 100mg'] },
]

export const landingFeatures = [
  { icon: ScanLine,   title: 'AI Prescription Scanner',  desc: 'Upload a photo of your prescription and let AI extract every detail instantly. No manual entry needed.', module: 'AI OCR' },
  { icon: Bell,       title: 'Smart Reminders',          desc: 'Never miss a dose with intelligent notifications that adapt to your schedule and medication regimen.', module: 'Reminders' },
  { icon: Bot,        title: 'AI Health Assistant',      desc: 'Ask anything about your medications — side effects, interactions, dosages — and get instant AI-powered answers.', module: 'AI Chat' },
  { icon: BarChart3,  title: 'Advanced Analytics',       desc: 'Track adherence trends, identify patterns, and generate detailed reports for your healthcare provider.', module: 'Analytics' },
  { icon: HeartPulse, title: 'Health Insights',          desc: 'Get personalized health scores and insights based on your medication adherence and history.', module: 'AI Insights' },
  { icon: Shield,     title: 'Secure & Private',          desc: 'Your medical data is encrypted and private. We comply with healthcare security standards.', module: 'Security' },
]

export const howItWorks = [
  { step: 1, title: 'Add Your Medications',  desc: 'Manually add medicines or scan a prescription with AI-powered OCR to auto-fill details.', icon: PlusCircle },
  { step: 2, title: 'Get Smart Reminders',   desc: 'Receive timely notifications for each dose across all your devices.',                      icon: Bell },
  { step: 3, title: 'Track & Analyze',        desc: 'Monitor your adherence, view history, and generate reports for better health outcomes.',    icon: BarChart3 },
]

export const settingsItems = [
  { icon: User,    label: 'Profile',              desc: 'Name, email, and personal details' },
  { icon: Bell,    label: 'Notifications',        desc: 'Reminder alerts and preferences' },
  { icon: Shield,  label: 'Privacy & Security',   desc: 'Data sharing, encryption, and security settings' },
  { icon: Palette, label: 'Appearance',           desc: 'Theme, colors, and display options' },
  { icon: Globe,   label: 'Language & Region',    desc: 'Language, timezone, and date format' },
  { icon: Smartphone, label: 'Device Sync',       desc: 'Connected devices and sync preferences' },
  { icon: Volume2, label: 'Accessibility',        desc: 'Voice guidance, font size, and accessibility' },
  { icon: Eye,     label: 'Data & Analytics',     desc: 'Health data sharing and analytics preferences' },
]

export const frequencyOptions = [
  { value: 'Once daily',        label: 'Once daily' },
  { value: 'Twice daily',       label: 'Twice daily' },
  { value: 'Three times daily', label: 'Three times daily' },
  { value: 'Four times daily',  label: 'Four times daily' },
  { value: 'Every other day',   label: 'Every other day' },
  { value: 'Weekly',            label: 'Weekly' },
  { value: 'As needed',         label: 'As needed' },
]

export const medicineList = [
  { id: 1,  name: 'Aspirin',     dose: '100mg',  frequency: 'Twice daily',     time: '08:00 AM', status: 'Active',    refill: 'Jul 15, 2026', stock: 12 },
  { id: 2,  name: 'Metformin',   dose: '500mg',  frequency: 'Once daily',      time: '01:00 PM', status: 'Active',    refill: 'Jul 20, 2026', stock: 28 },
  { id: 3,  name: 'Vitamin D',   dose: '2000 IU', frequency: 'Once daily',     time: '08:00 AM', status: 'Active',    refill: 'Aug 01, 2026', stock: 45 },
  { id: 4,  name: 'Lisinopril',  dose: '10mg',   frequency: 'Once daily',      time: '07:00 AM', status: 'Active',    refill: 'Jul 12, 2026', stock: 8 },
  { id: 5,  name: 'Atorvastatin',dose: '20mg',   frequency: 'Once daily',      time: '09:00 PM', status: 'Active',    refill: 'Jul 25, 2026', stock: 18 },
]

export const dummyLogs = [
  { date: '2026-07-08', name: 'Aspirin',     dose: '100mg',  time: '08:00 AM', status: 'Taken' },
  { date: '2026-07-08', name: 'Vitamin D',   dose: '2000 IU', time: '08:00 AM', status: 'Taken' },
  { date: '2026-07-08', name: 'Metformin',   dose: '500mg',  time: '01:00 PM', status: 'Taken' },
  { date: '2026-07-08', name: 'Aspirin',     dose: '100mg',  time: '08:00 PM', status: 'Upcoming' },
  { date: '2026-07-07', name: 'Aspirin',     dose: '100mg',  time: '08:00 AM', status: 'Taken' },
  { date: '2026-07-07', name: 'Vitamin D',   dose: '2000 IU', time: '08:00 AM', status: 'Missed' },
  { date: '2026-07-07', name: 'Metformin',   dose: '500mg',  time: '01:00 PM', status: 'Taken' },
  { date: '2026-07-07', name: 'Aspirin',     dose: '100mg',  time: '08:00 PM', status: 'Taken' },
  { date: '2026-07-06', name: 'Aspirin',     dose: '100mg',  time: '08:00 AM', status: 'Taken' },
  { date: '2026-07-06', name: 'Vitamin D',   dose: '2000 IU', time: '08:00 AM', status: 'Taken' },
  { date: '2026-07-06', name: 'Metformin',   dose: '500mg',  time: '01:00 PM', status: 'Missed' },
  { date: '2026-07-06', name: 'Aspirin',     dose: '100mg',  time: '08:00 PM', status: 'Taken' },
]

export const adherenceData = {
  weekly: [92, 88, 95, 100, 87, 92, 94],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

export const aiSuggestedPrompts = [
  'What does Aspirin do?',
  'Explain my prescription',
  'Side effects of Metformin',
  'Medicine interactions',
  'My tomorrow schedule',
]

export const aiChatHistory = [
  { role: 'assistant', text: "Hello! I'm your AI medication assistant. I can help you with information about your medications, dosages, side effects, and more. How can I help you today?" },
]

export const reportsData = {
  weeklyAdherence: { value: 94, change: '+2%', trend: 'up' },
  totalDoses: { value: 28, change: '+4', trend: 'up' },
  missedDoses: { value: 2, change: '-1', trend: 'down' },
  streakDays: { value: 6, change: '+2', trend: 'up' },
  upcomingRefills: { value: 2, change: '0', trend: 'neutral' },
  aiScore: { value: 87, change: '+3', trend: 'up' },
}
