const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MON_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function getDateStrip(from: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function formatDateLabel(date: Date, today: Date): string {
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate()

  if (sameDay) return 'Today'

  const day  = DAY_NAMES[date.getDay()]
  const num  = date.getDate()

  if (num === 1) {
    return `${day} 1 ${MON_NAMES[date.getMonth()]}`
  }
  return `${day} ${num}`
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function msUntilMidnight(from: Date): number {
  const midnight = new Date(from)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - from.getTime()
}
