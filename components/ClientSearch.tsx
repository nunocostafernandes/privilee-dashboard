'use client'
import { useRef, useState } from 'react'

interface Result {
  client_name: string
  client_email: string
  client_mobile: string | null
  class_name: string
  class_date: string
  class_time: string
  studio_name: string
  type: string
}

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  booking:      { text: 'Booked',   color: 'var(--green)' },
  early_cancel: { text: 'Early Cancel', color: 'var(--accent)' },
  late_cancel:  { text: 'Late Cancel',  color: 'var(--red)' },
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ClientSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`, { cache: 'no-store' })
        const data = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
  }

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative mb-4">
      <div className="relative">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Find client by name, email or mobile..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {searching && (
        <div className="absolute right-3 top-2.5">
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        </div>
      )}

      {open && results.length > 0 && (
        <div
          className="absolute z-20 w-full mt-1.5 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((r, i) => {
            const t = TYPE_LABEL[r.type] ?? TYPE_LABEL.booking
            return (
              <div
                key={i}
                className="px-4 py-3 transition-colors"
                style={{
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.client_name}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.client_email}{r.client_mobile ? ` | ${r.client_mobile}` : ''}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{r.class_name}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: t.color, background: `${t.color}18` }}
                      >
                        {t.text}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.studio_name} | {formatDate(r.class_date)} {r.class_time}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
