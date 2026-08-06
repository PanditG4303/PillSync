/** Parse backend naive datetime strings as local wall-clock time. */
export function parseScheduleDatetime(value) {
  if (!value) return null
  if (value instanceof Date) return value

  const raw = String(value).trim()
  // Already timezone-aware
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
  )
  if (!match) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const [, y, m, day, h, min, s = '0'] = match
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(day),
    Number(h),
    Number(min),
    Number(s),
  )
}

export function formatTime(value) {
  const d = parseScheduleDatetime(value)
  if (!d) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(value) {
  const d = parseScheduleDatetime(value)
  if (!d) return ''
  return d.toLocaleDateString()
}

export function isSameLocalDay(a, b = new Date()) {
  const da = parseScheduleDatetime(a)
  if (!da) return false
  return da.toDateString() === b.toDateString()
}
