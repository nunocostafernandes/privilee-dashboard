'use client'
import { useEffect, useState } from 'react'
import { getDateStrip, formatDateLabel, toDateString, msUntilMidnight } from '@/lib/date-utils'

interface DayStats {
  total: number
  privilee: number
}

interface Props {
  active: string // YYYY-MM-DD
  onChange: (date: string) => void
  dayStats?: Record<string, DayStats>
}

export default function DateStrip({ active, onChange, dayStats }: Props) {
  const [today, setToday] = useState(() => new Date())
  const strip = getDateStrip(today)

  // Advance at midnight
  useEffect(() => {
    const ms = msUntilMidnight(today)
    const timer = setTimeout(() => {
      const newToday = new Date()
      setToday(newToday)
      if (active === toDateString(today)) {
        onChange(toDateString(newToday))
      }
    }, ms)
    return () => clearTimeout(timer)
  }, [today, active, onChange])

  const hasStats = dayStats && Object.keys(dayStats).length > 0

  return (
    <div className="flex gap-2 py-3 px-1 overflow-x-auto">
      {strip.map((date) => {
        const ds = toDateString(date)
        const isActive = ds === active
        const stats = dayStats?.[ds]
        return (
          <button
            key={ds}
            onClick={() => onChange(ds)}
            className={`flex flex-col items-center whitespace-nowrap transition-colors ${
              hasStats ? 'px-3 py-2 rounded-xl min-w-[60px]' : 'px-4 py-2 rounded-full'
            } ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
            }`}
          >
            <span className="text-sm font-semibold">{formatDateLabel(date, today)}</span>
            {hasStats && (
              <span
                className="text-[10px] font-medium mt-0.5 leading-none"
                style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
              >
                {stats ? `${stats.total} · ${stats.privilee}P` : '·'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
