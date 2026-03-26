'use client'
import { useState, useEffect } from 'react'

interface ClassItem {
  classId: number
  className: string
  startTime: string
  endTime: string
  totalBooked: number
  maxCapacity: number
  waitlistCount: number
  bookingCount: number
}

interface Visit { name: string; status: string; serviceName: string }

interface Props {
  cls: ClassItem
  siteId: string
  refreshKey: number
}

function pillColor(totalBooked: number, maxCapacity: number, waitlistCount: number): string {
  if (waitlistCount > 0)                                    return 'bg-[var(--red)]'
  if (maxCapacity > 0 && totalBooked >= maxCapacity)        return 'bg-[var(--red)]'
  if (maxCapacity > 0 && totalBooked / maxCapacity >= 0.8)  return 'bg-[var(--accent)]'
  return 'bg-[var(--green)]'
}

function statusColor(status: string): string {
  if (status === 'Waitlisted') return 'text-[var(--text-orange)]'
  if (['LateCanceled', 'NoShow', 'Unknown'].includes(status)) return 'text-[var(--text-muted)]'
  return 'text-[var(--text)]'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    Confirmed: 'Confirmed', Booked: 'Confirmed', SignedIn: 'Signed In',
    Waitlisted: 'Waitlisted', LateCanceled: 'Late-Cancel', NoShow: 'No-Show',
  }
  return map[status] ?? 'Unknown'
}

function formatTime(dt: string): string {
  const d = new Date(dt)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const GRACE_MS = 20 * 60 * 1000

function isPastClass(startTime: string): boolean {
  return Date.now() > new Date(startTime).getTime() + GRACE_MS
}

export default function ClassCard({ cls, siteId, refreshKey }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [visits, setVisits]     = useState<Visit[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(false)

  useEffect(() => { setVisits(null) }, [refreshKey])

  const past = isPastClass(cls.startTime)
  const pill = past ? 'bg-[var(--text-muted)]' : pillColor(cls.totalBooked, cls.maxCapacity, cls.waitlistCount)

  async function toggle() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (visits !== null) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/classvisits?classId=${cls.classId}&siteId=${siteId}`)
      if (!res.ok) throw new Error()
      setVisits(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`bg-[var(--card)] rounded-xl overflow-hidden cursor-pointer hover:brightness-110 transition-all ${past ? 'opacity-40' : ''}`}
      onClick={toggle}
    >
      <div className="flex items-center px-4 py-3 gap-3">
        <span className="text-[var(--text-muted)] text-sm w-24 shrink-0">
          {formatTime(cls.startTime)}
        </span>
        <span className="flex-1 font-semibold text-sm truncate">{cls.className}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white shrink-0 ${pill}`}>
          {visits !== null ? visits.length : cls.bookingCount}
        </span>
      </div>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '999px' : '0' }}
      >
        <div className="border-t border-[var(--border)] px-4 py-3">
          {loading && (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-4 rounded bg-[var(--skeleton)] animate-pulse" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-[var(--text-muted)] text-sm">
              Could not load clients. Try refreshing.
            </p>
          )}
          {!loading && !error && visits !== null && visits.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm">No bookings yet.</p>
          )}
          {!loading && !error && visits && visits.length > 0 && (
            <ul className="space-y-2">
              {visits.map((v, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <div>
                    <span>{v.name}</span>
                    {v.serviceName && (
                      <span className="block text-xs text-[var(--text-muted)]">{v.serviceName}</span>
                    )}
                  </div>
                  {past && (
                    <span className={`shrink-0 ml-4 ${statusColor(v.status)}`}>{statusLabel(v.status)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
