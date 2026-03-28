'use client'
import { useEffect, useState } from 'react'
import { getDateStrip, formatDateLabel, toDateString, msUntilMidnight } from '@/lib/date-utils'

interface Props {
  active: string // YYYY-MM-DD
  onChange: (date: string) => void
  dayStats?: Record<string, number>
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
    <div className="flex gap-1.5 py-2 overflow-x-auto">
      {strip.map((date) => {
        const ds = toDateString(date)
        const isActive = ds === active
        const count = dayStats?.[ds] ?? 0
        return (
          <button
            key={ds}
            onClick={() => onChange(ds)}
            className="flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all cursor-pointer min-w-[56px]"
            style={{
              background: isActive ? 'var(--accent)' : 'var(--surface)',
              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: isActive ? '0 2px 8px rgba(249,115,22,0.25)' : 'none',
              color: isActive ? '#fff' : 'var(--text-muted)',
            }}
          >
            <span className="text-xs font-semibold">{formatDateLabel(date, today)}</span>
            {hasStats && (
              <span
                className="text-[10px] font-bold mt-1 tabular-nums"
                style={{
                  color: isActive
                    ? 'rgba(255,255,255,0.8)'
                    : count > 0 ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {count > 0 ? `${count}P` : '--'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
