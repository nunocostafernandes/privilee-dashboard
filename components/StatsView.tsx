'use client'
import { useEffect, useRef, useState } from 'react'

interface Booking {
  id: number
  studio_name: string
  class_name: string
  class_date: string
  class_time: string
  client_name: string
  client_email: string
  notes: string | null
  created_at: string
}

const STUDIO_CONFIG: Record<string, { short: string; color: string }> = {
  'Alserkal Avenue': { short: 'Alserkal', color: '#f97316' },
  'Town Square':     { short: 'Town Sq.', color: '#22c55e' },
  'Abu Dhabi':       { short: 'Abu Dhabi', color: '#60a5fa' },
}

function formatDate(date: string, time: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + time
}

function NoteCell({ booking, onSave }: { booking: Booking; onSave: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(booking.notes ?? '')
  const [saving, setSaving]   = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  function startEdit() {
    setValue(booking.notes ?? '')
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/bookings/note', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, notes: value.trim() || null }),
    })
    onSave(booking.id, value.trim())
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setValue(booking.notes ?? '')
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Type a note… (Enter to save, Esc to cancel)"
          className="w-full rounded-lg px-3 py-2 text-xs resize-none focus:outline-none"
          style={{
            background: 'rgba(249,115,22,0.07)',
            border: '1px solid rgba(249,115,22,0.35)',
            color: 'var(--text)',
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-semibold px-3 py-1 rounded-md transition-opacity disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancel}
            className="text-xs px-3 py-1 rounded-md"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="w-full text-left rounded-lg px-3 py-2 transition-colors"
      style={{
        background: booking.notes ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${booking.notes ? 'var(--border)' : 'transparent'}`,
        minHeight: '34px',
      }}
      onMouseEnter={e => {
        if (!booking.notes) e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={e => {
        if (!booking.notes) e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {booking.notes ? (
        <span className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
          {booking.notes}
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          + Add note
        </span>
      )}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export default function StatsView() {
  const [bookings, setBookings]         = useState<Booking[] | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)
  const [search, setSearch]             = useState('')
  const [studioFilter, setStudioFilter] = useState('All')

  useEffect(() => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then(data => { setBookings(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  function handleNoteSave(id: number, notes: string) {
    setBookings(prev => prev
      ? prev.map(b => b.id === id ? { ...b, notes: notes || null } : b)
      : prev
    )
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--card)', opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    )
  }

  if (error || !bookings) {
    return <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Could not load bookings.</p>
  }

  const studios = Array.from(new Set(bookings.map(b => b.studio_name)))
  const countByStudio = studios.map(s => ({ name: s, count: bookings.filter(b => b.studio_name === s).length }))

  const filtered = bookings.filter(b => {
    const matchStudio = studioFilter === 'All' || b.studio_name === studioFilter
    const q = search.toLowerCase()
    const matchSearch = !q
      || b.client_name.toLowerCase().includes(q)
      || b.client_email.toLowerCase().includes(q)
      || b.class_name.toLowerCase().includes(q)
    return matchStudio && matchSearch
  })

  return (
    <div className="mt-3 space-y-4">

      {/* Stats strip */}
      <div className="flex gap-px rounded-xl overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="flex-1 px-4 py-3 flex flex-col" style={{ background: 'var(--card)' }}>
          <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total</span>
          <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{bookings.length}</span>
        </div>
        {countByStudio.map(s => {
          const cfg = STUDIO_CONFIG[s.name]
          return (
            <div key={s.name} className="flex-1 px-4 py-3 flex flex-col" style={{ background: 'var(--card)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest mb-1 truncate" style={{ color: 'var(--text-muted)' }}>
                {cfg?.short ?? s.name}
              </span>
              <span className="text-xl font-bold" style={{ color: cfg?.color ?? 'var(--text)' }}>{s.count}</span>
            </div>
          )
        })}
      </div>

      {/* Search + studio filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, class…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-all"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <select
          value={studioFilter}
          onChange={e => setStudioFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg focus:outline-none"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <option value="All">All Studios</option>
          {studios.map(s => (
            <option key={s} value={s}>{STUDIO_CONFIG[s]?.short ?? s}</option>
          ))}
        </select>
      </div>

      {/* Booking rows */}
      {filtered.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No bookings match.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const cfg = STUDIO_CONFIG[b.studio_name]
            return (
              <div
                key={b.id}
                className="rounded-xl px-4 pt-3 pb-2"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                {/* Top row: client + class info */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{b.client_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{b.client_email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-2 justify-end mb-0.5">
                      <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{b.class_name}</p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: cfg?.color ?? 'var(--text-muted)',
                          background: cfg ? `${cfg.color}20` : 'var(--border)',
                        }}
                      >
                        {cfg?.short ?? b.studio_name}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(b.class_date, b.class_time)}</p>
                  </div>
                </div>

                {/* Notes — full width, always visible */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <NoteCell booking={b} onSave={handleNoteSave} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
