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
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="text-xs text-[var(--text-muted)]">
          {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        <svg
          className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  )
}
