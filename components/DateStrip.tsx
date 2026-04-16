'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDateStrip, formatDateLabel, toDateString, msUntilMidnight } from '@/lib/date-utils'

interface Props {
  active: string // YYYY-MM-DD
  onChange: (date: string) => void
  dayStats?: Record<string, number>
}

export default function DateStrip({ active, onChange, dayStats }: Props) {
  const [today, setToday] = useState(() => new Date())
  const [offset, setOffset] = useState(0) // days offset from today
  const calendarRef = useRef<HTMLInputElement>(null)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() + offset)
  const strip = getDateStrip(startDate)

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

  const goBack = useCallback(() => setOffset(o => o - 6), [])
  const goForward = useCallback(() => setOffset(o => o + 6), [])
  const goToday = useCallback(() => { setOffset(0); onChange(toDateString(today)) }, [today, onChange])

  function handleCalendarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    const picked = new Date(val + 'T00:00:00')
    const diffMs = picked.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const diffDays = Math.round(diffMs / 86400000)
    setOffset(diffDays)
    onChange(val)
  }

  const hasStats = dayStats && Object.keys(dayStats).length > 0
  const isOnToday = offset >= 0 && offset < 6

  const navBtnStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    width: 32,
    height: 32,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  }

  return (
    <div className="flex items-center gap-1.5 py-2">
      {/* Back arrow */}
      <button onClick={goBack} style={navBtnStyle} title="Previous 6 days">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Date pills */}
      <div className="flex gap-1.5 flex-1 overflow-x-auto">
        {strip.map((date) => {
          const ds = toDateString(date)
          const isActive = ds === active
          const isToday = ds === toDateString(today)
          const count = dayStats?.[ds] ?? 0
          return (
            <button
              key={ds}
              onClick={() => onChange(ds)}
              className="flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all cursor-pointer min-w-[56px]"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--surface)',
                border: `1px solid ${isActive ? 'var(--accent)' : isToday ? 'var(--accent)' : 'var(--border)'}`,
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
                  {count > 0 ? count : '--'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Forward arrow */}
      <button onClick={goForward} style={navBtnStyle} title="Next 6 days">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* Today button (only show when not on today's strip) */}
      {!isOnToday && (
        <button
          onClick={goToday}
          style={{
            ...navBtnStyle,
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            border: '1px solid rgba(249,115,22,0.3)',
            fontSize: 10,
            fontWeight: 700,
            width: 'auto',
            padding: '0 10px',
          }}
          title="Jump to today"
        >
          Today
        </button>
      )}

      {/* Calendar picker */}
      <button
        onClick={() => calendarRef.current?.showPicker()}
        style={navBtnStyle}
        title="Pick a date"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      <input
        ref={calendarRef}
        type="date"
        value={active}
        onChange={handleCalendarChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        tabIndex={-1}
      />
    </div>
  )
}
