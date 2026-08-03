import {
  Pill, Bell, Target, ScanLine, BarChart3, Bot,
  PlusCircle, HeartPulse, Shield,
} from 'lucide-react'

export const quickActions = [
  { label: 'Add Medicine', icon: Pill, to: '/add-medicine', color: 'bg-primary-50 text-primary-600' },
  { label: 'Scan Prescription', icon: ScanLine, to: '/ai-scanner', color: 'bg-secondary-50 text-secondary-600' },
  { label: 'Ask AI Assistant', icon: Bot, to: '/ai-assistant', color: 'bg-accent-50 text-accent-600' },
  { label: 'Refill Predictions', icon: Target, to: '/refills', color: 'bg-amber-50 text-amber-600' },
]

export const landingFeatures = [
  { icon: ScanLine, title: 'AI Prescription Scanner', desc: 'Upload a photo of your prescription and let AI extract every detail instantly.', module: 'AI OCR' },
  { icon: Bell, title: 'Smart Reminders', desc: 'Never miss a dose with intelligent notifications that adapt to your schedule.', module: 'Reminders' },
  { icon: Bot, title: 'AI Health Assistant', desc: 'Ask anything about your medications — side effects, interactions, dosages.', module: 'AI Chat' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Track adherence trends, identify patterns, and generate detailed reports.', module: 'Analytics' },
  { icon: HeartPulse, title: 'Health Insights', desc: 'Get personalized health scores based on your medication adherence.', module: 'AI Insights' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your medical data is encrypted and private. We comply with healthcare standards.', module: 'Security' },
]

export const howItWorks = [
  { step: 1, title: 'Add Your Medications', desc: 'Manually add medicines or scan a prescription with AI-powered OCR.', icon: PlusCircle },
  { step: 2, title: 'Get Smart Reminders', desc: 'Receive timely notifications for each dose across all your devices.', icon: Bell },
  { step: 3, title: 'Track & Analyze', desc: 'Monitor your adherence, view history, and generate reports for better health.', icon: BarChart3 },
]

export const aiSuggestedPrompts = [
  'What does Aspirin do?',
  'Explain my prescription',
  'Side effects of Metformin',
  'Medicine interactions',
  'My tomorrow schedule',
]

export const aiChatHistory = [
  {
    role: 'assistant',
    text: "Hello! I'm your AI medication assistant. I can help you with information about your medications, dosages, side effects, and more. How can I help you today?",
  },
]
