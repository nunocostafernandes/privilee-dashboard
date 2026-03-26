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

const STUDIO_SHORT: Record<string, string> = {
  'Alserkal Avenue': 'Alserkal',
  'Town Square':     'Town Sq.',
  'Abu Dhabi':       'Abu Dhabi',
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
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

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={2}
          className="w-full bg-[var(--bg)] border border-[var(--accent)] rounded px-2 py-1 text-xs resize-none focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs text-[var(--accent)] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel} className="text-xs text-[var(--text-muted)]">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="text-left w-full group"
    >
      {booking.notes
        ? <span className="text-xs text-[var(--text)]">{booking.notes}</span>
        : <span className="text-xs text-[var(--border)] group-hover:text-[var(--text-muted)] transition-colors">Add note…</span>
      }
    </button>
  )
}

export default function StatsView() {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [search, setSearch]     = useState('')
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
      <div className="space-y-2 mt-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-9 rounded-lg bg-[var(--card)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !bookings) {
    return <p className="text-[var(--text-muted)] text-xs mt-3">Could not load bookings.</p>
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
    <div className="mt-3 space-y-3">
      {/* Summary row */}
      <div className="flex gap-2 flex-wrap">
        <div className="bg-[var(--card)] rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Total</span>
          <span className="text-sm font-bold">{bookings.length}</span>
        </div>
        {countByStudio.map(s => (
          <div key={s.name} className="bg-[var(--card)] rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{STUDIO_SHORT[s.name] ?? s.name}</span>
            <span className="text-sm font-bold">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <select
          value={studioFilter}
          onChange={e => setStudioFilter(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="All">All</option>
          {studios.map(s => <option key={s} value={s}>{STUDIO_SHORT[s] ?? s}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-xs">No bookings match.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--card)] border-b border-[var(--border)]">
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium">Client</th>
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium hidden sm:table-cell">Studio</th>
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium">Class</th>
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium hidden md:table-cell">Date</th>
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium">Notes</th>
                <th className="text-left px-3 py-2 text-xs text-[var(--text-muted)] font-medium hidden lg:table-cell">Booked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--bg)]' : 'bg-[var(--card)]'}`}
                >
                  <td className="px-3 py-2">
                    <span className="block text-xs font-medium">{b.client_name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{b.client_email}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)] hidden sm:table-cell whitespace-nowrap">
                    {STUDIO_SHORT[b.studio_name] ?? b.studio_name}
                  </td>
                  <td className="px-3 py-2 text-xs">{b.class_name}</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)] hidden md:table-cell whitespace-nowrap">
                    {b.class_date} · {b.class_time}
                  </td>
                  <td className="px-3 py-2 min-w-[120px] max-w-[200px]">
                    <NoteCell booking={b} onSave={handleNoteSave} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)] hidden lg:table-cell whitespace-nowrap">
                    {formatCreatedAt(b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
