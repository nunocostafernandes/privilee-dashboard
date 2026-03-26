'use client'
import { useEffect, useState } from 'react'

interface Booking {
  id: number
  studio_name: string
  class_name: string
  class_date: string
  class_time: string
  client_name: string
  client_email: string
  client_mobile: string | null
  mbo_booking_id: number | null
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
  })
}

const STUDIO_SHORT: Record<string, string> = {
  'Alserkal Avenue': 'Alserkal',
  'Town Square':     'Town Sq.',
  'Abu Dhabi':       'Abu Dhabi',
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

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-12 rounded-xl bg-[var(--card)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !bookings) {
    return <p className="text-[var(--text-muted)] text-sm mt-4">Could not load bookings.</p>
  }

  // Summary counts
  const studios = Array.from(new Set(bookings.map(b => b.studio_name)))
  const countByStudio = studios.map(s => ({
    name: s,
    count: bookings.filter(b => b.studio_name === s).length,
  }))

  // Filters
  const filtered = bookings.filter(b => {
    const matchStudio = studioFilter === 'All' || b.studio_name === studioFilter
    const q = search.toLowerCase()
    const matchSearch = !q || b.client_name.toLowerCase().includes(q)
      || b.client_email.toLowerCase().includes(q)
      || b.class_name.toLowerCase().includes(q)
    return matchStudio && matchSearch
  })

  return (
    <div className="mt-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-[var(--card)] rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Bookings</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        {countByStudio.map(s => (
          <div key={s.name} className="bg-[var(--card)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">{STUDIO_SHORT[s.name] ?? s.name}</p>
            <p className="text-2xl font-bold">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, class…"
          className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <select
          value={studioFilter}
          onChange={e => setStudioFilter(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="All">All Studios</option>
          {studios.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No bookings match.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--card)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-semibold">Client</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-semibold hidden sm:table-cell">Studio</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-semibold">Class</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-semibold hidden md:table-cell">Class Date</th>
                <th className="text-left px-4 py-3 text-xs text-[var(--text-muted)] font-semibold">Booked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? 'bg-[var(--bg)]' : 'bg-[var(--card)]'}`}
                >
                  <td className="px-4 py-3">
                    <span className="block font-medium">{b.client_name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{b.client_email}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden sm:table-cell">
                    {STUDIO_SHORT[b.studio_name] ?? b.studio_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{b.class_name}</span>
                    <span className="block text-xs text-[var(--text-muted)] sm:hidden">{STUDIO_SHORT[b.studio_name] ?? b.studio_name}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell whitespace-nowrap">
                    {formatDate(b.class_date)} · {b.class_time}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
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
