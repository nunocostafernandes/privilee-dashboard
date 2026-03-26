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
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + time
}

function formatBookedAt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function NoteCell({ booking, onSave }: { booking: Booking; onSave: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(booking.notes ?? '')
  const [saving, setSaving]   = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
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
      <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Add a note…"
          className="w-full rounded-md px-2.5 py-1.5 text-xs resize-none focus:outline-none"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.4)',
            color: 'var(--text)',
          }}
        />
        <div className="flex gap-3 items-center">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-semibold transition-opacity disabled:opacity-40"
            style={{ color: 'var(--accent)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={cancel}
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>↵ save · esc cancel</span>
        </div>
      </div>
    )
  }

  return (
    <button onClick={startEdit} className="group flex items-start gap-1.5 w-full text-left">
      {booking.notes ? (
        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {booking.notes}
        </span>
      ) : (
        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <PencilIcon />
          <span>Add note</span>
        </span>
      )}
      {booking.notes && (
        <span className="opacity-0 group-hover:opacity-60 transition-opacity mt-px shrink-0" style={{ color: 'var(--accent)' }}>
          <PencilIcon />
        </span>
      )}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
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
      <div className="mt-4 space-y-px">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 rounded animate-pulse" style={{ background: 'var(--card)', opacity: 1 - i * 0.12 }} />
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
    <div className="mt-3">

      {/* Stats strip */}
      <div className="flex items-center gap-0 mb-4 overflow-x-auto">
        <div className="shrink-0 pr-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Total</p>
          <p className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>{bookings.length}</p>
        </div>
        {countByStudio.map(s => {
          const cfg = STUDIO_CONFIG[s.name]
          return (
            <div key={s.name} className="shrink-0 px-4" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {cfg?.short ?? s.name}
              </p>
              <p className="text-2xl font-bold leading-none" style={{ color: cfg?.color ?? 'var(--text)' }}>
                {s.count}
              </p>
            </div>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, class…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          {['All', ...studios].map(s => {
            const cfg = STUDIO_CONFIG[s]
            const isActive = studioFilter === s
            const label = cfg?.short ?? s
            return (
              <button
                key={s}
                onClick={() => setStudioFilter(s)}
                className="px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  color: isActive ? (cfg?.color ?? 'var(--accent)') : 'var(--text-muted)',
                  borderBottom: isActive ? `2px solid ${cfg?.color ?? 'var(--accent)'}` : '2px solid transparent',
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      {search || studioFilter !== 'All' ? (
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      ) : null}

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No bookings match.</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Column headers */}
          <div
            className="grid gap-0 px-4 py-2"
            style={{
              background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
              gridTemplateColumns: '1fr auto',
            }}
          >
            <div className="flex items-center gap-6">
              <span className="text-xs font-semibold uppercase tracking-widest w-40 shrink-0" style={{ color: 'var(--text-muted)' }}>Client</span>
              <span className="text-xs font-semibold uppercase tracking-widest hidden sm:block" style={{ color: 'var(--text-muted)' }}>Class · Date</span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Notes</span>
          </div>

          {filtered.map((b, i) => {
            const cfg = STUDIO_CONFIG[b.studio_name]
            return (
              <div
                key={b.id}
                className="px-4 py-3 transition-colors"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-start gap-0">
                  {/* Left: client + class */}
                  <div className="flex items-start gap-6 flex-1 min-w-0">
                    {/* Client */}
                    <div className="w-40 shrink-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{b.client_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{b.client_email}</p>
                    </div>

                    {/* Class + studio + date */}
                    <div className="hidden sm:block min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{b.class_name}</span>
                        <span
                          className="text-xs font-semibold px-1.5 py-px rounded shrink-0"
                          style={{
                            color: cfg?.color ?? 'var(--text-muted)',
                            background: cfg ? `${cfg.color}18` : 'var(--border)',
                          }}
                        >
                          {cfg?.short ?? b.studio_name}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(b.class_date, b.class_time)}
                        <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
                        <span>booked {formatBookedAt(b.created_at)}</span>
                      </p>
                    </div>

                    {/* Mobile: class only */}
                    <div className="block sm:hidden min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{b.class_name}</p>
                      <p className="text-xs" style={{ color: cfg?.color ?? 'var(--text-muted)' }}>{cfg?.short ?? b.studio_name}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="w-36 shrink-0 pl-3">
                    <NoteCell booking={b} onSave={handleNoteSave} />
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
