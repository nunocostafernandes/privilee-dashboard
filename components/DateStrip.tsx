'use client'
import { useEffect, useState } from 'react'
import { getDateStrip, formatDateLabel, toDateString, msUntilMidnight } from '@/lib/date-utils'

interface Props {
  active: string // YYYY-MM-DD
  onChange: (date: string) => void
}

export default function DateStrip({ active, onChange }: Props) {
  const [today, setToday] = useState(() => new Date())
  const strip = getDateStrip(today)

  // Advance at midnight
  useEffect(() => {
    const ms = msUntilMidnight(today)
    const timer = setTimeout(() => {
      const newToday = new Date()
      setToday(newToday)
      // If user was on "Today", follow it
      if (active === toDateString(today)) {
        onChange(toDateString(newToday))
      }
    }, ms)
    return () => clearTimeout(timer)
  }, [today, active, onChange])

  return (
    <div className="flex gap-2 py-3 px-1 overflow-x-auto">
      {strip.map((date) => {
        const ds = toDateString(date)
        const isActive = ds === active
        return (
          <button
            key={ds}
            onClick={() => onChange(ds)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
            }`}
          >
            {formatDateLabel(date, today)}
          </button>
        )
      })}
    </div>
  )
}
