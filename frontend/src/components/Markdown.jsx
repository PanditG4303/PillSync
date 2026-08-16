import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Check, Copy } from 'lucide-react'
import { useTheme } from './ThemeContext'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function MarkdownContent({ text, className = '', streaming = false }) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const containerRef = useRef(null)

  const html = useMemo(() => {
    if (!text) return ''
    const raw = marked.parse(text)
    return DOMPurify.sanitize(raw)
  }, [text])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const pres = root.querySelectorAll('pre')
    pres.forEach((pre) => {
      if (pre.querySelector('.md-copy-btn')) return
      const lang = pre.querySelector('code')?.className?.match(/language-([\w-]+)/)?.[1] || ''
      const code = pre.querySelector('code')?.textContent || ''
      const wrapper = document.createElement('div')
      wrapper.className = 'md-code-wrap'
      const header = document.createElement('div')
      header.className = `md-code-header ${isLight ? 'light' : ''}`
      const label = document.createElement('span')
      label.textContent = lang || 'code'
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'md-copy-btn'
      btn.textContent = 'Copy'
      btn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(code)
          btn.textContent = 'Copied'
          setTimeout(() => { btn.textContent = 'Copy' }, 1500)
        } catch {
          // clipboard unavailable
        }
      }
      header.appendChild(label)
      header.appendChild(btn)
      pre.parentNode?.replaceChild(wrapper, pre)
      wrapper.appendChild(header)
      wrapper.appendChild(pre)
    })
  }, [html, isLight])

  return (
    <div
      ref={containerRef}
      className={`md-content ${className}`}
      style={{
        color: isLight ? '#16294d' : 'rgba(255,255,255,0.85)',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}