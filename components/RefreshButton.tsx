'use client'
import { useEffect, useState } from 'react'

interface Props {
  onRefresh: () => void
  loading: boolean
  lastUpdated: Date | null
}

export default function RefreshButton({ onRefresh, loading, lastUpdated }: Props) {
  const [minutesAgo, setMinutesAgo] = useState(0)

  useEffect(() => {
    if (!lastUpdated) return
    setMinutesAgo(0)
    const interval = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000))
    }, 60000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  return (
    <div className="flex items-center gap-2">
      {lastUpdated && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--green)' }} />
          <span className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {minutesAgo === 0 ? 'Live' : `${minutesAgo}m ago`}
          </span>
        </div>
      )}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        title="Refresh"
      >
        <svg
          className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: 'var(--text-muted)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}
